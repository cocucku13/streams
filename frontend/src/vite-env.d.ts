interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
	readonly VITE_WS_BASE?: string;
	readonly VITE_YANDEX_MAPS_API_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
