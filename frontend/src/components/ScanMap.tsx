import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { ScanLog } from '../types'

// Fix default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface Props {
  scans: ScanLog[]
}

function FitBounds({ scans }: Props) {
  const map = useMap()
  useEffect(() => {
    if (scans.length === 0) return
    const bounds = L.latLngBounds(scans.map((s) => [s.latitude, s.longitude]))
    map.fitBounds(bounds, { padding: [30, 30] })
  }, [scans, map])
  return null
}

export default function ScanMap({ scans }: Props) {
  const defaultCenter: [number, number] = scans.length > 0
    ? [scans[0].latitude, scans[0].longitude]
    : [10.7769, 106.7009] // Ho Chi Minh City default

  return (
    <MapContainer center={defaultCenter} zoom={13} style={{ height: '400px', width: '100%' }} className="rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds scans={scans} />
      {scans.map((scan) => (
        <Marker key={scan.id} position={[scan.latitude, scan.longitude]}>
          <Popup>
            <div className="text-sm">
              <p><strong>QR:</strong> {scan.qr_code_id}</p>
              <p><strong>Người quét:</strong> {scan.username}</p>
              <p><strong>Thời gian:</strong> {scan.scanned_at}</p>
              <p><strong>IP:</strong> {scan.ip_address}</p>
              <p><strong>Tọa độ:</strong> {scan.latitude.toFixed(6)}, {scan.longitude.toFixed(6)}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
