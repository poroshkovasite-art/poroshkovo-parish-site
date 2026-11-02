/* Leaflet is served locally; OSM receives IP, browser metadata and the site origin. */
document.querySelectorAll('[data-parish-map]').forEach(surface=>{
 const frame=surface.closest('.map-frame'),fallback=frame.querySelector('.map-static-fallback'),status=frame.parentElement.querySelector('[data-map-status]');
 const uk=document.documentElement.lang==='uk';
 if(!window.L)return;
 try{
  const point=[Number(surface.dataset.latitude),Number(surface.dataset.longitude)];
  const map=L.map(surface,{scrollWheelZoom:false,zoomControl:false}).setView(point,17);
  L.control.zoom({position:'topleft',zoomInTitle:uk?'Збільшити':'Zoom in',zoomOutTitle:uk?'Зменшити':'Zoom out'}).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  const layer=L.tileLayer(surface.dataset.tileUrl,{maxZoom:19,crossOrigin:'anonymous',referrerPolicy:'strict-origin-when-cross-origin',attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
  let loaded=0;
  layer.on('tileload',()=>{loaded++;fallback.hidden=true;status.hidden=true;});
  layer.on('tileerror',()=>{if(!loaded){status.hidden=false;status.textContent=uk?'Не вдалося завантажити картографічні тайли. Скористайтеся посиланнями Google Maps або маршруту нижче.':'Map tiles could not be loaded. Use the Google Maps or directions links below.';}});
  layer.addTo(map);
  const marker=L.marker(point,{title:'Парафія святих Кирила і Методія',alt:uk?'Точна метка храму':'Exact church location',keyboard:true}).addTo(map);
  const label=document.createElement('span');label.textContent='Парафія святих Кирила і Методія';
  marker.bindTooltip(label,{permanent:true,direction:'top',offset:[0,-36],className:'parish-map-label'});
  surface.dataset.mapReady='true';
  // Read-only geometry is useful to verify the exact pin without moving it.
  surface.parishMap=map;surface.parishMarker=marker;
  new ResizeObserver(()=>map.invalidateSize()).observe(surface);
 }catch{
  fallback.hidden=false;status.hidden=false;
  status.textContent=uk?'Інтерактивна карта недоступна. Скористайтеся посиланням Google Maps або маршрутом.':'The interactive map is unavailable. Use the Google Maps or directions link.';
 }
});
