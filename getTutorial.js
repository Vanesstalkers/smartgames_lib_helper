(formattedPath) => {
  const path = formattedPath.split('-');

  const obj = lib.utils.getDeep(this, ['domain', ...path]) || lib.utils.getDeep(this, ['lib', ...path]);
  
  if (!obj?.steps) throw new Error(`Tutorial "${formattedPath}" not found`);
  return obj;
};
