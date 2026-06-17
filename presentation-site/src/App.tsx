import { ArchitectureSection } from './components/ArchitectureSection'
import { DatabaseSchema } from './components/DatabaseSchema'
import { DiagramGallery } from './components/DiagramGallery'
import { Footer } from './components/Footer'
import { HeroSection } from './components/HeroSection'
import { Navbar } from './components/Navbar'
import { OverviewSection } from './components/OverviewSection'

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <OverviewSection />
        <DiagramGallery />
        <DatabaseSchema />
        <ArchitectureSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
