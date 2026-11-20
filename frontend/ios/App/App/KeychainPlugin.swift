import Capacitor
import Foundation
import Security

/// Login tokens in the Keychain (encrypted, tied to this phone).
/// The web app can get, set and remove a value by key.
@objc(KeychainPlugin)
public class KeychainPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KeychainPlugin"
    public let jsName = "Keychain"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
    ]

    private let service = "com.breathewithme.app.login"
    private let installedMark = "keychainReady"

    // Keychain items survive deleting the app, so a reinstall would still be logged in.
    // UserDefaults is deleted with the app, so no flag there means it's a fresh install.
    override public func load() {
        let settings = UserDefaults.standard
        if !settings.bool(forKey: installedMark) {
            SecItemDelete([kSecClass as String: kSecClassGenericPassword,
                           kSecAttrService as String: service] as CFDictionary)
            settings.set(true, forKey: installedMark)
        }
    }

    private func query(_ key: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: key]
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("key is required") }
        var search = query(key)
        search[kSecReturnData as String] = true
        search[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(search as CFDictionary, &item)
        if status == errSecItemNotFound { return call.resolve([:]) }  // nothing saved
        guard status == errSecSuccess, let data = item as? Data, let value = String(data: data, encoding: .utf8) else {
            return call.reject("Keychain read failed (\(status))")
        }
        call.resolve(["value": value])
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else {
            return call.reject("key and value are required")
        }
        SecItemDelete(query(key) as CFDictionary)
        var item = query(key)
        item[kSecValueData as String] = Data(value.utf8)
        // after first unlock, this device only (no backups)
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(item as CFDictionary, nil)
        guard status == errSecSuccess else { return call.reject("Keychain write failed (\(status))") }
        call.resolve()
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("key is required") }
        let status = SecItemDelete(query(key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            return call.reject("Keychain delete failed (\(status))")
        }
        call.resolve()
    }
}
