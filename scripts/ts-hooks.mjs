// The app's modules import each other without a file extension, which Vite
// resolves but Node does not. Retry any failed relative specifier with ".ts" so
// scripts here can import src/lib/*.ts directly instead of duplicating logic.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
      return next(`${specifier}.ts`, context);
    }
    throw error;
  }
}
