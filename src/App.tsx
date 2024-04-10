import { Route, Routes } from 'react-router-dom'
import Home from './Pages/Home'
import Test from './Pages/Test'
import Parked from './Pages/Parked'
import Portfolio from './Pages/Portfolio'
import Skyline from './Pages/Skyline'

export default function App() {
  return (
    <>
       <Routes>
          {/* <Route path="/" element={<Parked />} /> */}
          <Route path="/" element={<Portfolio />} />
          <Route path="/skyline" element={<Skyline />} />
          <Route path="/home" element={<Home />} />
          <Route path="/test" element={<Test />} />
       </Routes>
    </>
  )
}