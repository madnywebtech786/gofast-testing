import { notFound } from 'next/navigation'
import ServiceDetailPage from '@/components/landing/pages/ServiceDetailPage'

const SERVICES_META = {
  'same-day-delivery': {
    title: 'Same-Day Delivery — GoFastDelivery',
    description: 'Same-city pickup and delivery within hours. Perfect for urgent parcels, documents, and anything that cannot wait.',
  },
  'express-pickup': {
    title: 'Express Pickup — GoFastDelivery',
    description: 'Schedule a pickup in seconds from your phone. Our nearest driver heads to you immediately.',
  },
  'business-delivery': {
    title: 'Business Delivery — GoFastDelivery',
    description: 'Recurring bulk deliveries for Calgary businesses. Dedicated drivers, priority routing, seamless integration.',
  },
  'scheduled-runs': {
    title: 'Scheduled Runs — GoFastDelivery',
    description: 'Set up recurring delivery schedules and forget about it. We show up on time, every time.',
  },
  'hotshot-delivery': {
    title: 'Hotshot Delivery — GoFastDelivery',
    description: 'Dedicated single-load rush delivery for time-critical freight. One driver, one pickup, one destination.',
  },
}

export function generateStaticParams() {
  return Object.keys(SERVICES_META).map(slug => ({ slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const meta = SERVICES_META[slug]
  if (!meta) return {}
  return { title: meta.title, description: meta.description }
}

export default async function ServicePage({ params }) {
  const { slug } = await params
  if (!SERVICES_META[slug]) notFound()
  return <ServiceDetailPage slug={slug} />
}
