'use client'

import { useState, useEffect, useRef } from 'react'

interface LocationResult {
  id: string
  place_name: string
  center: [number, number] // [lng, lat]
  text: string
  context?: { id: string; text: string }[]
}

interface LocationAutocompleteProps {
  value: string
  onChange: (location: string, coordinates: { lat: number; lng: number } | null) => void
  placeholder?: string
  className?: string
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a location...',
  className = ''
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<LocationResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    // Click outside to close
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim() || !MAPBOX_TOKEN) {
      setResults([])
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
        new URLSearchParams({
          access_token: MAPBOX_TOKEN,
          types: 'address,poi,place,locality,neighborhood',
          limit: '5',
          language: 'en'
        })
      )

      const data = await response.json()

      if (data.features) {
        setResults(data.features)
        setIsOpen(true)
        setSelectedIndex(-1)
      }
    } catch (error) {
      console.error('Error searching locations:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setQuery(newValue)

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      searchLocations(newValue)
    }, 300)

    // If user is typing, clear the coordinates (they haven't selected yet)
    onChange(newValue, null)
  }

  const handleSelect = (result: LocationResult) => {
    const [lng, lat] = result.center
    setQuery(result.place_name)
    setIsOpen(false)
    setResults([])
    onChange(result.place_name, { lat, lng })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }

    setIsLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?` +
            new URLSearchParams({
              access_token: MAPBOX_TOKEN,
              types: 'address,poi,place',
              limit: '1'
            })
          )

          const data = await response.json()

          if (data.features && data.features.length > 0) {
            const place = data.features[0]
            setQuery(place.place_name)
            onChange(place.place_name, { lat: latitude, lng: longitude })
          } else {
            // Fallback to coordinates if no address found
            const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            setQuery(coordString)
            onChange(coordString, { lat: latitude, lng: longitude })
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error)
        } finally {
          setIsLoading(false)
        }
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Could not get your location. Please enter it manually.')
        setIsLoading(false)
      },
      { enableHighAccuracy: true }
    )
  }

  // Get the main text and secondary text for display
  const getDisplayText = (result: LocationResult) => {
    const main = result.text
    const secondary = result.place_name.replace(result.text, '').replace(/^,\s*/, '')
    return { main, secondary }
  }

  if (!MAPBOX_TOKEN) {
    return (
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value, null)
        }}
        placeholder={placeholder}
        className={className}
      />
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={className}
        />

        {/* Current location button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLoading}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors disabled:opacity-50"
          title="Use current location"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-[#2a2a2a] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
        >
          {results.map((result, index) => {
            const { main, secondary } = getDisplayText(result)
            return (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelect(result)}
                className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-start gap-3 ${
                  index === selectedIndex ? 'bg-white/10' : ''
                } ${index !== results.length - 1 ? 'border-b border-white/10' : ''}`}
              >
                <svg className="w-5 h-5 text-white/40 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{main}</div>
                  {secondary && (
                    <div className="text-white/50 text-sm truncate">{secondary}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
