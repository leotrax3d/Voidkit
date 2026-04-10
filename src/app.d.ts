declare global {
  namespace App {
    interface Platform {
      env: Env;
      ctx: ExecutionContext;
      caches: CacheStorage;
      cf?: IncomingRequestCfProperties
    }

    // interface Error {}
    // interface Locals {}
    // interface PageData {}
  }
}

export {};
