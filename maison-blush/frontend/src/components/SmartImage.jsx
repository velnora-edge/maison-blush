import { useState } from 'react'
import { Scissors } from 'lucide-react'
import { imageUrl } from '@shared/catalog.js'

/** Image load na ho (net issue / galat link) to khoobsurat placeholder dikhata hai — page kabhi toota hua nahi lagta. */
export default function SmartImage({ src, alt, width = 900, className = '', eager = false, ...rest }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div className={`img-fallback ${className}`} role="img" aria-label={alt}>
        <Scissors size={34} aria-hidden="true" />
      </div>
    )
  }
  return (
    <img
      className={className}
      src={imageUrl(src, width)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      {...rest}
    />
  )
}
