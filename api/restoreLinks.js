async (context, { inGame = false }) => {
  const { userId } = context.session.state;
  const user = lib.store('user').get(userId);

  const tutorialSource = inGame
    ? domain.game.tutorial || lib.game.tutorial
    : domain.lobby.tutorial || lib.lobby.tutorial;
  const helperLinks = tutorialSource?.getHelperLinks() || {};

  const updatedHelperLinks = {};
  for (const key of Object.keys(helperLinks)) {
    updatedHelperLinks[key] = { ...helperLinks[key], used: null };
  }

  user.set({ helperLinks: updatedHelperLinks }, { removeEmptyObject: true });
  await user.saveChanges();

  return { status: 'ok' };
};
