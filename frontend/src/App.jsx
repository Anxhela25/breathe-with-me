import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Breathing from './pages/Breathing.jsx'
import Grounding from './pages/Grounding.jsx'
import CheckIn from './pages/CheckIn.jsx'
import Closing from './pages/Closing.jsx'
import UrgentHelp from './pages/UrgentHelp.jsx'
import Chat from './pages/Chat.jsx'
import AuthForm from './pages/AuthForm.jsx'
import ChatTexts from './pages/ChatTexts.jsx'
import QuickQuestions from './pages/QuickQuestions.jsx'
import History from './pages/History.jsx'
import Insights from './pages/Insights.jsx'
import Summary from './pages/Summary.jsx'
import Settings from './pages/Settings.jsx'
import RequireAuth from './components/RequireAuth.jsx'

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
      <Route path="/questions" element={<QuickQuestions />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/chat-texts" element={<ChatTexts />} />
      <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
      <Route path="/insights" element={<RequireAuth><Insights /></RequireAuth>} />
      <Route path="/summary" element={<RequireAuth><Summary /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
