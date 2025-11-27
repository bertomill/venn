'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface EventAttendee {
  user_id: string
  status: 'going' | 'interested' | 'maybe'
}

interface Event {
  id: string
  title: string
  description: string
  start_date: string
  location: string
  event_type: string
  latitude: number | null
  longitude: number | null
  event_attendees: EventAttendee[]
}

interface EventsMapProps {
  events: Event[]
  onEventClick: (eventId: string) => void
  userLocation?: { lat: number; lng: number } | null
}

// You'll need to set this in your environment variables
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

export default function EventsMap({ events, onEventClick, userLocation }: EventsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  // Filter events that have coordinates
  const eventsWithCoords = events.filter(e => e.latitude && e.longitude)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return
    if (!MAPBOX_TOKEN) {
      console.warn('Mapbox token not set')
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    // Default to Toronto or user location
    const defaultCenter: [number, number] = userLocation
      ? [userLocation.lng, userLocation.lat]
      : [-79.3832, 43.6532] // Toronto

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: defaultCenter,
      zoom: 11
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add user location control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    )

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [userLocation])

  // Add markers for events
  useEffect(() => {
    if (!map.current) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add new markers
    eventsWithCoords.forEach(event => {
      if (!event.latitude || !event.longitude) return

      // Create custom marker element
      const el = document.createElement('div')
      el.className = 'event-marker'
      el.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #ec4899 0%, #f97316 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
          cursor: pointer;
          transition: transform 0.2s;
          border: 3px solid white;
        ">
          📅
        </div>
      `

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)'
      })
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)'
      })

      const marker = new mapboxgl.Marker(el)
        .setLngLat([event.longitude, event.latitude])
        .addTo(map.current!)

      marker.getElement().addEventListener('click', () => {
        setSelectedEvent(event)
        map.current?.flyTo({
          center: [event.longitude!, event.latitude!],
          zoom: 14,
          duration: 500
        })
      })

      markersRef.current.push(marker)
    })

    // Fit map to show all markers
    if (eventsWithCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      eventsWithCoords.forEach(event => {
        if (event.longitude && event.latitude) {
          bounds.extend([event.longitude, event.latitude])
        }
      })

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 13,
        duration: 1000
      })
    }
  }, [eventsWithCoords])

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

  const getAttendeeCounts = (attendees: EventAttendee[] = []) => {
    const going = attendees.filter(a => a.status === 'going').length
    const interested = attendees.filter(a => a.status === 'interested').length
    return { going, interested }
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-[60vh] bg-white/5 rounded-2xl flex items-center justify-center">
        <div className="text-center text-white/60">
          <div className="text-4xl mb-4">🗺️</div>
          <p>Map view requires a Mapbox token</p>
          <p className="text-sm text-white/40 mt-2">Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[60vh] rounded-2xl overflow-hidden">
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Selected event popup */}
      {selectedEvent && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-[#1a1a1a] border border-white/20 rounded-2xl p-4 shadow-2xl">
          <button
            onClick={() => setSelectedEvent(null)}
            className="absolute top-3 right-3 text-white/40 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="mb-3">
            <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/60">
              {selectedEvent.event_type}
            </span>
          </div>

          <h3 className="text-white font-semibold mb-2">{selectedEvent.title}</h3>

          <p className="text-white/60 text-sm mb-3 line-clamp-2">{selectedEvent.description}</p>

          <div className="space-y-1 text-xs text-white/40 mb-4">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>{formatDate(selectedEvent.start_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📍</span>
              <span className="line-clamp-1">{selectedEvent.location}</span>
            </div>
            {(getAttendeeCounts(selectedEvent.event_attendees).going > 0 ||
              getAttendeeCounts(selectedEvent.event_attendees).interested > 0) && (
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>
                  {getAttendeeCounts(selectedEvent.event_attendees).going} going,{' '}
                  {getAttendeeCounts(selectedEvent.event_attendees).interested} interested
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => onEventClick(selectedEvent.id)}
            className="w-full bg-gradient-to-r from-pink-500 to-orange-400 text-white py-2.5 rounded-xl font-medium hover:opacity-90 transition-all"
          >
            View Event
          </button>
        </div>
      )}

      {/* No events with location message */}
      {eventsWithCoords.length === 0 && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-4">📍</div>
            <p>No events with location data</p>
            <p className="text-sm text-white/60 mt-2">Events need coordinates to appear on the map</p>
          </div>
        </div>
      )}

      {/* Events count badge */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-full">
        <span className="text-white text-sm font-medium">
          {eventsWithCoords.length} event{eventsWithCoords.length !== 1 ? 's' : ''} on map
        </span>
      </div>
    </div>
  )
}
