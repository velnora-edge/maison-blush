import { AppProvider } from './context/AppContext.jsx'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Features from './components/Features.jsx'
import About from './components/About.jsx'
import Services from './components/Services.jsx'
import VideoShowcase from './components/VideoShowcase.jsx'
import Shop from './components/Shop.jsx'
import Gallery from './components/Gallery.jsx'
import Reviews from './components/Reviews.jsx'
import Booking from './components/Booking.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import OrderCheckout from './components/OrderCheckout.jsx'
import Chatbot from './components/Chatbot.jsx'
import { WhatsAppButton, BackToTop, Toast } from './components/Floating.jsx'

export default function App() {
  return (
    <AppProvider>
      <a className="skip-link" href="#about">Skip to content</a>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <About />
        <Services />
        <VideoShowcase />
        <Shop />
        <Gallery />
        <Reviews />
        <Booking />
        <Contact />
      </main>
      <Footer />
      <CartDrawer />
      <OrderCheckout />
      <WhatsAppButton />
      <BackToTop />
      <Chatbot />
      <Toast />
    </AppProvider>
  )
}
