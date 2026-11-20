import AVFoundation
import Capacitor
import UIKit

/// Main view controller: the Capacitor web view + our own plugins.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CalmCameraPlugin())
        bridge?.registerPluginInstance(KeychainPlugin())
        hideKeyboardToolbar()
    }

    /// Hides the up/down/done bar above the keyboard, Return already sends.
    /// Same trick as Capacitor's Keyboard plugin: a content view subclass with inputAccessoryView = nil.
    private func hideKeyboardToolbar() {
        guard let content = webView?.scrollView.subviews.first(where: {
            String(describing: type(of: $0)).hasPrefix("WKContent")
        }), let original = object_getClass(content) else { return }
        let name = "\(NSStringFromClass(original))_NoToolbar"
        var noToolbar: AnyClass? = NSClassFromString(name)
        if noToolbar == nil, let subclass = objc_allocateClassPair(original, name, 0) {
            let getter = #selector(getter: UIResponder.inputAccessoryView)
            let returnsNil: @convention(block) (AnyObject) -> AnyObject? = { _ in nil }
            if let method = class_getInstanceMethod(UIResponder.self, getter) {
                class_addMethod(subclass, getter, imp_implementationWithBlock(returnsNil), method_getTypeEncoding(method))
            }
            objc_registerClassPair(subclass)
            noToolbar = subclass
        }
        if let noToolbar { object_setClass(content, noToolbar) }
    }
}

/// Calm check: reads the pulse from a fingertip on the back camera, flash on.
/// Only the average RGB of each frame (~30/s) goes to the web app, the video never leaves the phone.
@objc(CalmCameraPlugin)
public class CalmCameraPlugin: CAPPlugin, CAPBridgedPlugin, AVCaptureVideoDataOutputSampleBufferDelegate {
    public let identifier = "CalmCameraPlugin"
    public let jsName = "CalmCamera"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lockExposure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "calm-camera")
    private var device: AVCaptureDevice?
    private var configured = false

    override public func load() {
        // never leave the camera and flash on in the background
        NotificationCenter.default.addObserver(
            self, selector: #selector(appWentToBackground),
            name: UIApplication.didEnterBackgroundNotification, object: nil)
    }

    @objc func start(_ call: CAPPluginCall) {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            guard granted else {
                call.reject("Camera permission was not given.", "PERMISSION_DENIED")
                return
            }
            self.queue.async {
                do {
                    try self.configure()
                    if !self.session.isRunning { self.session.startRunning() }
                    try self.setTorch(on: true)  // after startRunning, or iOS may switch it off again
                    call.resolve()
                } catch {
                    call.reject("The camera could not start: \(error.localizedDescription)", "CAMERA_ERROR")
                }
            }
        }
    }

    /// Locks exposure once the finger is on the lens, auto exposure would hide the pulse.
    @objc func lockExposure(_ call: CAPPluginCall) {
        queue.async {
            guard let device = self.device else { call.resolve(); return }
            do {
                try device.lockForConfiguration()
                if device.isExposureModeSupported(.locked) { device.exposureMode = .locked }
                if device.isWhiteBalanceModeSupported(.locked) { device.whiteBalanceMode = .locked }
                device.unlockForConfiguration()
                call.resolve()
            } catch {
                call.reject("Could not lock the exposure.", "CAMERA_ERROR")
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        queue.async {
            self.stopCamera()
            call.resolve()
        }
    }

    @objc private func appWentToBackground() {
        queue.async { self.stopCamera() }
    }

    private func stopCamera() {
        try? setTorch(on: false)
        if session.isRunning { session.stopRunning() }
    }

    private func configure() throws {
        if configured { return }
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            throw NSError(domain: "CalmCamera", code: 1, userInfo: [NSLocalizedDescriptionKey: "No back camera"])
        }
        session.beginConfiguration()
        session.sessionPreset = .low  // a tiny image is enough: only its average colour is used
        let input = try AVCaptureDeviceInput(device: camera)
        if session.canAddInput(input) { session.addInput(input) }

        let output = AVCaptureVideoDataOutput()
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        output.alwaysDiscardsLateVideoFrames = true
        output.setSampleBufferDelegate(self, queue: queue)
        if session.canAddOutput(output) { session.addOutput(output) }
        session.commitConfiguration()

        try camera.lockForConfiguration()
        // a steady 30 frames per second, so the time between beats can be measured
        camera.activeVideoMinFrameDuration = CMTime(value: 1, timescale: 30)
        camera.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: 30)
        if camera.isAutoFocusRangeRestrictionSupported { camera.autoFocusRangeRestriction = .near }
        camera.unlockForConfiguration()

        device = camera
        configured = true
    }

    private func setTorch(on: Bool) throws {
        guard let device = device, device.hasTorch else { return }
        try device.lockForConfiguration()
        if on {
            try device.setTorchModeOn(level: AVCaptureDevice.maxAvailableTorchLevel)
        } else {
            device.torchMode = .off
        }
        device.unlockForConfiguration()
    }

    public func captureOutput(
        _ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection
    ) {
        guard let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        CVPixelBufferLockBaseAddress(pixels, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixels, .readOnly) }
        guard let base = CVPixelBufferGetBaseAddress(pixels) else { return }

        let width = CVPixelBufferGetWidth(pixels)
        let height = CVPixelBufferGetHeight(pixels)
        let rowBytes = CVPixelBufferGetBytesPerRow(pixels)
        let data = base.assumingMemoryBound(to: UInt8.self)

        // average of the middle half of the image, every 2nd pixel (BGRA byte order)
        var red = 0, green = 0, blue = 0, count = 0
        for y in stride(from: height / 4, to: height * 3 / 4, by: 2) {
            let row = data + y * rowBytes
            for x in stride(from: width / 4, to: width * 3 / 4, by: 2) {
                let pixel = row + x * 4
                blue += Int(pixel[0])
                green += Int(pixel[1])
                red += Int(pixel[2])
                count += 1
            }
        }
        guard count > 0 else { return }
        let time = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
        notifyListeners("frame", data: [
            "t": time,
            "r": Double(red) / Double(count),
            "g": Double(green) / Double(count),
            "b": Double(blue) / Double(count),
        ])
    }
}
