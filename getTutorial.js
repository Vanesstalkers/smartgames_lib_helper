(formattedPath) => {
  const path = formattedPath.split('-');

  const obj = lib.utils.getDeep(this, ['domain', ...path]) || lib.utils.getDeep(this, ['lib', ...path]);

  const tutorial = typeof obj === 'function' ? obj() : obj;
  if (!tutorial?.steps) throw new Error(`Tutorial "${formattedPath}" not found`);
  return tutorial;
};
