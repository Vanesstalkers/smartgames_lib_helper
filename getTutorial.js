(formattedPath) => {
  const path = formattedPath.split('-');

  const obj = lib.utils.getDeep(domain, path) || lib.utils.getDeep(lib, path);

  const tutorial = typeof obj === 'function' ? obj() : obj;
  if (!tutorial?.steps) throw new Error(`Tutorial "${formattedPath}" not found`);
  return tutorial;
};
