import React, {
    useEffect,
    useState,
    useRef,
    useCallback,
    forwardRef,
    useImperativeHandle,
  } from 'react';
  import Map, {
    Marker,
    NavigationControl,
    Popup,
    FullscreenControl,
    GeolocateControl,
    ScaleControl,
  } from 'react-map-gl';
  import 'mapbox-gl/dist/mapbox-gl.css';
  import debounce from 'lodash.debounce';
  
  interface Stadium {
    stadiumName: string;
    stadiumCity: string;
    stadiumCountry: string;
    stadiumCapacity: number;
    surfaceType: string;
    longitude: number;
    latitude: number;
    _id: string;
  }
  
  interface StadiumMapProps {
    stadium: Stadium;
    mapStyle: string;
    is3D: boolean;
    isCustomMarkerAvailable: boolean;
    customMarkerUrl: string;
  }
  
  export interface StadiumMapRef {
    recenterMap: () => void;
  }
  
  const StadiumMap = forwardRef<StadiumMapRef, StadiumMapProps>(
    (
      { stadium, mapStyle, is3D, isCustomMarkerAvailable, customMarkerUrl },
      ref
    ) => {
      const mapRef = useRef<any>(null);
      const [showPopup, setShowPopup] = useState<boolean>(false);
      const initialViewState = {
        longitude: stadium.longitude,
        latitude: stadium.latitude,
        zoom: 15.5,
        pitch: is3D ? 65 : 0,
        bearing: is3D ? 60 : 0,
      };
  
      const handleMoveEnd = useCallback(
        debounce((event: any) => {
          const { viewState } = event;
        }, 300),
        []
      );
  
      useImperativeHandle(ref, () => ({
        recenterMap: () => {
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [stadium.longitude, stadium.latitude],
              zoom: 15.5,
              pitch: is3D ? 65 : 0,
              bearing: is3D ? 60 : 0,
              speed: 1.2,
              essential: true,
            });
          }
        },
      }));
  
      useEffect(() => {
        if (mapRef.current) {
          mapRef.current.flyTo({
            pitch: is3D ? 65 : 0,
            bearing: is3D ? 60 : 0,
            speed: 1.2,
            essential: true,
          });
        }
      }, [is3D]);
  
      return (
        <div className="relative">
          <Map
            initialViewState={initialViewState}
            mapStyle={mapStyle}
            mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
            onMoveEnd={handleMoveEnd}
            style={{ width: '100%', height: 400 }}
            ref={mapRef}
          >
            <Marker
              longitude={stadium.longitude}
              latitude={stadium.latitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setShowPopup(true);
              }}
            >
              {isCustomMarkerAvailable ? (
                <img
                  src={customMarkerUrl}
                  alt="Stadium Marker"
                  className="h-8 w-8"
                />
              ) : (
                <svg
                  height="24"
                  width="24"
                  viewBox="0 0 24 24"
                  fill="red"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              )}
            </Marker>
  
            {showPopup && (
              <Popup
                longitude={stadium.longitude}
                latitude={stadium.latitude}
                anchor="top"
                onClose={() => setShowPopup(false)}
                closeOnClick={false}
              >
                <div className="text-center">
                  <h3 className="font-semibold">{stadium.stadiumName}</h3>
                  <p>
                    {stadium.stadiumCity}, {stadium.stadiumCountry}
                  </p>
                </div>
              </Popup>
            )}
  
            <NavigationControl position="top-left" />
            <FullscreenControl position="top-left" />
            <GeolocateControl position="top-left" />
            <ScaleControl />
          </Map>
        </div>
      );
    }
  );
  
  export default React.memo(StadiumMap);
  