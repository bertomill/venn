'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Event {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string | null
  location: string
  event_type: string
  image_url: string | null
  max_attendees: number | null
  creator_id: string
}

// Event Modal Component (Netflix-style)
function EventModal({ event, onClose }: { event: Event | null; onClose: () => void }) {
  if (!event) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Generate gradient based on event type - Apple Games palette
  const getGradient = (type: string) => {
    const gradients: Record<string, string> = {
      'Wellness': 'from-teal-500 to-emerald-700',
      'Social': 'from-red-500 to-rose-700',
      'Professional': 'from-blue-500 to-indigo-700',
      'Creative': 'from-orange-500 to-amber-700',
      'Learning': 'from-cyan-500 to-teal-700',
    }
    return gradients[type] || 'from-red-500 to-orange-700'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-[#181818] rounded-2xl overflow-hidden shadow-2xl transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-[#181818] rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero Image/Gradient */}
        <div className={`relative h-72 bg-gradient-to-br ${getGradient(event.event_type)}`}>
          {event.image_url && (event.image_url.startsWith('http://') || event.image_url.startsWith('https://') || event.image_url.startsWith('/')) && (
            <Image
              src={event.image_url}
              alt={event.title}
              fill
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="p-6 -mt-20 relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{event.title}</h2>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-white/10 rounded-md text-sm text-white/80 border border-white/20">
              {new Date(event.start_date).getFullYear()}
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-md text-sm text-white/80 border border-white/20">
              {event.event_type}
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-md text-sm text-white/80 border border-white/20">
              Event
            </span>
          </div>

          {/* Description */}
          <p className="text-white/70 text-base leading-relaxed mb-6">
            {event.description}
          </p>

          {/* Event Details */}
          <div className="flex flex-wrap gap-4 text-sm text-white/60 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(event.start_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{event.location}</span>
            </div>
            {event.max_attendees && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{event.max_attendees} spots</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-lg font-semibold text-lg hover:bg-white/90 transition-all"
          >
            Get Started
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 px-6 bg-[#2d2d2d] hover:bg-[#3d3d3d] transition-colors flex items-center justify-between text-left mb-[2px]"
      >
        <span className="text-white text-lg md:text-xl font-medium pr-4">{question}</span>
        <svg
          className={`w-8 h-8 text-white flex-shrink-0 transition-transform ${isOpen ? 'rotate-45' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      {isOpen && (
        <div className="bg-[#2d2d2d] px-6 pb-6 -mt-[2px]">
          <p className="text-white/70 text-base md:text-lg leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

// FAQ Section Component
function FAQSection() {
  const faqs = [
    {
      question: "What is Venn?",
      answer: "Venn is a community platform that helps you discover events and connect with people who share your interests and values. Our AI-powered matching system finds like-minded individuals so you can build meaningful relationships through shared experiences."
    },
    {
      question: "How does the matching work?",
      answer: "When you sign up, you'll select your interests from various categories like wellness, creativity, tech, and more. Our AI analyzes these preferences along with your location and availability to match you with compatible people and relevant events in your area."
    },
    {
      question: "Is Venn free to use?",
      answer: "Yes! Venn is completely free to join and use. You can create a profile, browse events, connect with others, and even host your own events at no cost. We believe everyone should have access to meaningful community connections."
    },
    {
      question: "How do I create an event?",
      answer: "Once you're signed in, simply click 'Create Event' from your dashboard. You can set the event type, date, location, capacity, and vibe. Invite friends directly or make it public for others in your interest community to discover and join."
    },
    {
      question: "Is my information safe?",
      answer: "Absolutely. We take privacy seriously. Your personal information is encrypted and never shared without your consent. You control who can see your profile and what information is visible. We also have community guidelines and safety features to ensure a positive experience for everyone."
    },
    {
      question: "Can I use Venn in my city?",
      answer: "Venn is available worldwide! Our platform works in any location. The more people join from your area, the better your matches and event recommendations will be. Invite friends to grow your local community."
    }
  ]

  return (
    <section className="relative z-20 py-16 px-6 md:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">Frequently Asked Questions</h2>
        <div className="space-y-[2px]">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  )
}

// Trending Events Carousel Component
function TrendingEvents({ events, onEventClick }: { events: Event[]; onEventClick: (event: Event) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    checkScroll()
    const ref = scrollRef.current
    if (ref) {
      ref.addEventListener('scroll', checkScroll)
      return () => ref.removeEventListener('scroll', checkScroll)
    }
  }, [events])

  // Generate gradient based on event type - Apple Games palette
  const getGradient = (type: string) => {
    const gradients: Record<string, string> = {
      'Wellness': 'from-teal-500 to-emerald-700',
      'Social': 'from-red-500 to-rose-700',
      'Professional': 'from-blue-500 to-indigo-700',
      'Creative': 'from-orange-500 to-amber-700',
      'Learning': 'from-cyan-500 to-teal-700',
    }
    return gradients[type] || 'from-red-500 to-orange-700'
  }

  if (events.length === 0) return null

  return (
    <section className="relative z-20 py-12 md:py-16">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="px-6 md:px-8 mb-6 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-white">Trending Now</h2>
          <Link
            href="/events"
            className="text-white/60 hover:text-white text-sm font-medium transition-colors flex items-center gap-1"
          >
            See all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Carousel Container */}
        <div className="relative group">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-0 bottom-0 z-10 w-12 md:w-16 bg-gradient-to-r from-[#0a0a0a] to-transparent flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            </button>
          )}

          {/* Right Arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-0 bottom-0 z-10 w-12 md:w-16 bg-gradient-to-l from-[#0a0a0a] to-transparent flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {/* Scrollable Events */}
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide px-6 md:px-8 pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {events.map((event, index) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="relative flex-shrink-0 w-[140px] md:w-[180px] group/card transition-transform hover:scale-105"
              >
                {/* Ranking Number */}
                <div className="absolute -left-2 bottom-0 z-10">
                  <span
                    className="text-7xl md:text-8xl font-black text-transparent"
                    style={{
                      WebkitTextStroke: '2px rgba(255,255,255,0.3)',
                    }}
                  >
                    {index + 1}
                  </span>
                </div>

                {/* Event Card */}
                <div className={`relative aspect-[2/3] rounded-lg overflow-hidden bg-gradient-to-br ${getGradient(event.event_type)} ml-6`}>
                  {event.image_url && (event.image_url.startsWith('http://') || event.image_url.startsWith('https://') || event.image_url.startsWith('/')) ? (
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <span className="text-white/80 text-sm font-medium text-center line-clamp-3">
                        {event.title}
                      </span>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/20 transition-colors" />

                  {/* Event type badge */}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white font-medium">
                    {event.event_type}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrendingEvents()
  }, [])

  const fetchTrendingEvents = async () => {
    const supabase = createSupabaseBrowserClient()

    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(10)

    if (data) {
      setEvents(data)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Event Modal */}
      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />

      {/* Background - Mosaic grid with Apple Games color palette */}
      <div className="absolute inset-0 z-0">
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a] z-10" />

        {/* Mosaic grid with warm colors */}
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 opacity-30 transform -rotate-12 scale-125 -translate-y-20">
          {[...Array(48)].map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-lg ${
                i % 5 === 0 ? 'bg-gradient-to-br from-red-800/60 to-orange-900/60' :
                i % 5 === 1 ? 'bg-gradient-to-br from-teal-800/60 to-emerald-900/60' :
                i % 5 === 2 ? 'bg-gradient-to-br from-blue-800/60 to-indigo-900/60' :
                i % 5 === 3 ? 'bg-gradient-to-br from-orange-800/60 to-amber-900/60' :
                'bg-gradient-to-br from-cyan-800/60 to-teal-900/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Ambient glow effects - Apple Games palette */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <nav className="relative z-20 px-6 md:px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/Venn-Logo.png"
              alt="Venn"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="text-white text-2xl font-bold tracking-tight">venn</span>
          </div>

          {/* Right side nav */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/events"
              className="hidden md:block text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/auth/login"
              className="px-5 py-2.5 bg-white text-black rounded-lg text-sm font-semibold hover:bg-white/90 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Centered like Netflix */}
      <div className="relative z-20 min-h-[60vh] md:min-h-[70vh] flex flex-col items-center justify-center px-6 md:px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Tagline badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/80 text-sm font-medium">Find your people</span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.1] tracking-tight">
            Where interests
            <br />
            <span className="bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
              become connections
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Discover events and meet people who share your passions.
            Build meaningful relationships through shared experiences.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold text-lg hover:from-red-500 hover:to-orange-500 transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
            >
              Get Started
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/events"
              className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Explore Events
            </Link>
          </div>
        </div>
      </div>

      {/* Trending Events Section */}
      {!loading && events.length > 0 && (
        <TrendingEvents events={events} onEventClick={setSelectedEvent} />
      )}

      {/* More Reasons Section */}
      <section className="relative z-20 py-12 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6 px-0">More Reasons to Join</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Card 1 */}
            <div className="p-6 bg-gradient-to-br from-[#1a1a1a] to-[#0d1f2d] rounded-2xl border border-white/5">
              <h3 className="text-xl font-semibold text-white mb-2">AI-Powered Matching</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Our smart algorithm finds people who share your exact interests and values. No more endless scrolling.
              </p>
              <div className="mt-4 flex justify-end">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 bg-gradient-to-br from-[#1a1a1a] to-[#1f1a0d] rounded-2xl border border-white/5">
              <h3 className="text-xl font-semibold text-white mb-2">Host Your Own Events</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Create and manage events with ease. From intimate gatherings to large meetups, we&apos;ve got you covered.
              </p>
              <div className="mt-4 flex justify-end">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-20 py-16 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How Venn works
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Three simple steps to finding your community
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Card 1 */}
            <div className="group p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-red-500/50 transition-all hover:bg-white/10">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Share your interests</h3>
              <p className="text-white/50 leading-relaxed">
                Tell us what you love - from wellness and creativity to tech and adventure. We&apos;ll find your match.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-teal-500/50 transition-all hover:bg-white/10">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Discover your people</h3>
              <p className="text-white/50 leading-relaxed">
                Our AI matches you with like-minded individuals who share your passions and values.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-orange-500/50 transition-all hover:bg-white/10">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Join experiences</h3>
              <p className="text-white/50 leading-relaxed">
                Attend events, host gatherings, and build lasting connections through shared experiences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof / Stats section */}
      <section className="relative z-20 py-16 px-6 md:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">10K+</div>
              <div className="text-white/50 text-sm">Active Members</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-white/50 text-sm">Events Hosted</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">50+</div>
              <div className="text-white/50 text-sm">Interest Categories</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">95%</div>
              <div className="text-white/50 text-sm">Match Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA with Email */}
      <section className="relative z-20 py-16 px-6 md:px-8 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-white/80 text-lg mb-6">
            Ready to connect? Enter your email to create your account.
          </p>
          <form
            className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const email = (form.elements.namedItem('email') as HTMLInputElement).value
              window.location.href = `/auth/signup?email=${encodeURIComponent(email)}`
            }}
          >
            <input
              type="email"
              name="email"
              placeholder="Email address"
              required
              className="flex-1 px-4 py-4 bg-[#1a1a1a] border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-colors"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-semibold text-lg hover:from-red-500 hover:to-orange-500 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              Get Started
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 py-12 px-6 md:px-8 border-t border-white/10 bg-black/40">
        <div className="max-w-7xl mx-auto">
          {/* Footer Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/faq" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">FAQ</Link>
              <Link href="/help" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">Help Center</Link>
              <Link href="/account" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">Account</Link>
            </div>
            <div>
              <Link href="/about" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">About Us</Link>
              <Link href="/careers" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">Careers</Link>
              <Link href="/blog" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">Blog</Link>
            </div>
            <div>
              <Link href="/privacy" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">Privacy</Link>
              <Link href="/terms" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">Terms of Use</Link>
              <Link href="/cookies" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">Cookie Preferences</Link>
            </div>
            <div>
              <Link href="/contact" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">Contact Us</Link>
              <Link href="/safety" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">Safety Guidelines</Link>
              <Link href="/community" className="text-white/50 hover:text-white/80 text-sm transition-colors block mb-3">Community Rules</Link>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/5">
            <div className="flex items-center gap-3">
              <Image
                src="/Venn-Logo.png"
                alt="Venn"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-white/70 font-semibold">venn</span>
            </div>
            <div className="text-white/30 text-sm">
              © 2024 Venn. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
