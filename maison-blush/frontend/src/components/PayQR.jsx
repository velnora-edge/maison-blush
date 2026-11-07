import { useMemo, useState } from 'react'
import { salon } from '@shared/salon.js'
import { qrMatrix } from '../utils/qr.js'
import { money } from '../utils/format.js'

/**
 * Client ki asli QR image (public/images/payment-qr.png) dikhata hai.
 * Wo na ho to demo QR banata hai jisme payment ki detail likhi hoti hai.
 */
export default function PayQR({ amount, reference }) {
  const [custom, setCustom] = useState(true)
  const q = salon.payments.qr

  const { path, size } = useMemo(() => {
    const text = `${salon.name} | Pay ${money(amount)} | Ref ${reference} | ${q.accountNumber}`
    const m = qrMatrix(text)
    const pad = 4
    let d = ''
    m.forEach((row, y) => {
      let x = 0
      while (x < row.length) {
        if (!row[x]) { x++; continue }
        let run = 0
        while (x + run < row.length && row[x + run]) run++
        d += `M${x + pad} ${y + pad}h${run}v1h-${run}z`
        x += run
      }
    })
    return { path: d, size: m.length + pad * 2 }
  }, [amount, reference, q.accountNumber])

  return (
    <figure className="qr-box">
      {custom ? (
        <img src={q.image} alt={`Scan to pay ${salon.name}`} className="qr-img" onError={() => setCustom(false)} />
      ) : (
        <svg className="qr-img" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Payment QR code" shapeRendering="crispEdges">
          <rect width={size} height={size} fill="#fff" />
          <path d={path} fill="#1b1411" />
        </svg>
      )}
      <figcaption>
        <strong>Scan with any banking app</strong>
        <span>{q.apps.join(' · ')}</span>
        {!custom && salon.payments.demoMode && <small>Demo QR — add your own payment-qr.png to go live</small>}
      </figcaption>
    </figure>
  )
}
