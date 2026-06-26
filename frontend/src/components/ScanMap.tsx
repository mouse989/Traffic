import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { ScanLog } from '../types'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const USER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
]

function createColoredIcon(color: string) {
  return L.divIcon({
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7],
  })
}

interface Props {
  scans: ScanLog[]
  filterUsername?: string
}

function FitBounds({ scans }: { scans: ScanLog[] }) {
  const map = useMap()
  useEffect(() => {
    if (scans.length === 0) return
    const bounds = L.latLngBounds(scans.map((s) => [s.latitude, s.longitude]))
    map.fitBounds(bounds, { padding: [30, 30] })
  }, [scans, map])
  return null
}

export default function ScanMap({ scans, filterUsername }: Props) {
  const visible = filterUsername
    ? scans.filter((s) => s.username === filterUsername)
    : scans

  // Build stable username → color mapping from all scans
  const userColorMap = useMemo(() => {
    const usernames = [...new Set(scans.map((s) => s.username))].sort()
    const map: Record<string, string> = {}
    usernames.forEach((u, i) => {
      map[u] = USER_COLORS[i % USER_COLORS.length]
    })
    return map
  }, [scans])

  const defaultCenter: [number, number] =
    visible.length > 0
      ? [visible[0].latitude, visible[0].longitude]
      : [10.7769, 106.7009]

  // Legend: unique users in visible set
  const visibleUsers = [...new Set(visible.map((s) => s.username))].sort()

  return (
    <div>
      <MapContainer center={defaultCenter} zoom={13} style={{ height: '400px', width: '100%' }} className="rounded-lg">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds scans={visible} />
        {visible.map((scan) => (
          <Marker
            key={scan.id}
            position={[scan.latitude, scan.longitude]}
            icon={createColoredIcon(userColorMap[scan.username] ?? '#666')}
          >
            <Popup>
              <div className="text-sm">
                <p><strong>QR:</strong> {scan.qr_code_id}</p>
                {scan.device_name && <p><strong>Thiết bị:</strong> {scan.device_name}</p>}
                <p><strong>Người quét:</strong> <span style={{ color: userColorMap[scan.username] }}>■</span> {scan.username}</p>
                <p><strong>Thời gian:</strong> {scan.scanned_at}</p>
                <p><strong>IP:</strong> {scan.ip_address}</p>
                <p><strong>Tọa độ:</strong> {scan.latitude.toFixed(6)}, {scan.longitude.toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {visibleUsers.length > 1 && (
        <div className="flex flex-wrap gap-3 mt-2 px-1">
          {visibleUsers.map((u) => (
            <span key={u} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                style={{ background: userColorMap[u], width: 10, height: 10, borderRadius: '50%', display: 'inline-block', border: '1.5px solid white', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
              />
              {u}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
