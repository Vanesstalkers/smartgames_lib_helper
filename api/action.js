async (context, data) => {
  const { userId } = context.session.state;
  const user = lib.store('user').get(userId);

  await lib.helper.updateTutorial(user, data);

  return { status: 'ok' };
};