import { Routes, Route } from 'react-router-dom'
import './App.css'
import DataEntryForm from './Time-Card/DataEntryForm'
import TimeCard from './Time-Card/TimeCard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<TimeCard />} />
      <Route path="/data-entry" element={<DataEntryForm />} />
    </Routes>
  )
}

export default App