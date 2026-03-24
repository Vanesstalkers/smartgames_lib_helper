async (context, { inGame = false }) => {
  const { userId } = context.session.state;
  const user = lib.store('user').get(userId);

  const getHelperLinks = inGame
    ? domain.game.tutorial?.getHelperLinks || lib.game.tutorial?.getHelperLinks
    : domain.lobby.tutorial?.getHelperLinks || lib.lobby.tutorial?.getHelperLinks;
  if (!getHelperLinks) throw new Error('getHelperLinks not found');

  const helperLinks = getHelperLinks() || {};

  const updatedHelperLinks = {};
  for (const key of Object.keys(helperLinks)) {
    updatedHelperLinks[key] = { ...helperLinks[key], used: null };
  }

  user.set({ helperLinks: updatedHelperLinks }, { removeEmptyObject: true });
  await user.saveChanges();

  return { status: 'ok' };
};
