async (context, { inGame = false }) => {
  const { userId } = context.session.state;
  const user = lib.store('user').get(userId);

  const tutorialSource = inGame ? domain.game : domain.lobby;
  const helperLinks = tutorialSource.tutorial.getHelperLinks();

  const updatedHelperLinks = {};
  for (const key of Object.keys(helperLinks)) {
    updatedHelperLinks[key] = { ...helperLinks[key], used: null };
  }

  user.set({ helperLinks: updatedHelperLinks }, { removeEmptyObject: true });
  await user.saveChanges({ saveToLobbyUser: true });

  return { status: 'ok' };
};
