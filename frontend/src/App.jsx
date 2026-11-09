import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Breathing from './pages/Breathing.jsx'
import Grounding from './pages/Grounding.jsx'
import CheckIn from './pages/CheckIn.jsx'
import Closing from './pages/Closing.jsx'
import UrgentHelp from './pages/UrgentHelp.jsx'
import Chat from './pages/Chat.jsx'
import ComingSoon from './pages/ComingSoon.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/breathe" element={<Breathing />} />
      <Route path="/grounding" element={<Grounding />} />
      <Route path="/check-in" element={<CheckIn />} />
      <Route path="/closing" element={<Closing />} />
      <Route path="/urgent" element={<UrgentHelp />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/history" element={<ComingSoon title="My history" />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
