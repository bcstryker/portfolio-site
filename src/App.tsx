import { Route, Routes } from 'react-router-dom'
import Home from './Pages/Home'
import Test from './Pages/Test'
import Parked from './Pages/Parked'

export default function App() {
  return (
    <>
       <Routes>
          <Route path="/" element={<Parked />} />
          <Route path="/home" element={<Home />} />
          <Route path="/test" element={<Test />} />
       </Routes>
    </>
  )
}