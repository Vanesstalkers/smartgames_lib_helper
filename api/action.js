async (context, data) => {
  const { userId } = context.session.state;
  const user = lib.store('user').get(userId);

  if (typeof user.updateTutorial === 'function') await user.updateTutorial(data);
  else await lib.helper.updateTutorial(user, data);

  return { status: 'ok' };
};
