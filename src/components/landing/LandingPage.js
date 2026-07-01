'use client'
import Navbar from './Navbar'
import HeroSlider from './HeroSlider'
import AboutSection from './AboutSection'
import ServicesSection from './ServicesSection'
import DeliveryTypesSection from './DeliveryTypesSection'
import WhyUsSection from './WhyUsSection'
import ServiceAreasSection from './ServiceAreasSection'
import ProcessSection from './ProcessSection'
import CTASection from './CTASection'
import ReviewsSection from './ReviewsSection'
import ContactSection from './ContactSection'
import Footer from './Footer'
import SocialDock from './SocialDock'
// import AnnouncementPopup from './AnnouncementPopup'

export default function LandingPage() {
  return (
    <div data-page="landing">
      {/* <AnnouncementPopup /> */}
      <Navbar />
      <SocialDock />
      <main>
        <HeroSlider />
        <AboutSection />
        <ServicesSection />
        <DeliveryTypesSection />
        <ProcessSection />
        <WhyUsSection />
        <ServiceAreasSection />
        <CTASection />
        <ReviewsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}
