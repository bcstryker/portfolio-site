import { Route, Routes } from 'react-router-dom'
import Home from './Pages/Home'
import Zoomies from './Pages/Test'
import Parked from './Pages/Parked'
import Portfolio from './Pages/Portfolio'
import Skyline1 from './Pages/Skyline1'
import Skyline2 from './Pages/Skyline2'

export default function App() {
  return (
    <>
       <Routes>
          {/* <Route path="/" element={<Parked />} /> */}
          <Route path="/" element={<Portfolio />} />
          <Route path="/skyline1" element={<Skyline1 />} />
          <Route path="/skyline2" element={<Skyline2 />} />
          <Route path="/home" element={<Home />} />
          <Route path="/test" element={<Zoomies />} />
       </Routes>
    </>
  )
}