import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Router from './router'
import 'antd/dist/reset.css'
import './index.css'

// GitHub Pages SPA fallback: restore route from 404.html redirect query
;(function (location) {
  if (location.search[0] === '?' && location.search[1] === '/') {
    const decoded = location.search
      .slice(2)
      .split('&')
      .map((param) => param.replace(/~and~/g, '&'))
      .join('?')
    window.history.replaceState(
      null,
      '',
      location.pathname.slice(0, -1) + decoded + location.hash,
    )
  }
})(window.location)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
)
