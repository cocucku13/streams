interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
	readonly VITE_WS_BASE?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
