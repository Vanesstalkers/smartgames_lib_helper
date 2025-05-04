async (context, { action, step, tutorial: tutorialName, usedLink, isMobile }) => {
  const { userId } = context.session.state;
  const user = lib.store('user').get(userId);
  const globalTutorialData = { finishedTutorials: {}, helperLinks: {} };
  let { currentTutorial } = user;
  if (!currentTutorial) currentTutorial = {};

  if (tutorialName) {
    if (currentTutorial.active) throw new Error('Другое обучение уже активно в настоящий момент');

    const tutorial = lib.helper.getTutorial(tutorialName);
    const helper = step
      ? Object.entries(tutorial).find(([key]) => key === step)[1]
      : Object.values(tutorial).find(({ initialStep }) => initialStep);
    if (!helper) throw new Error('Tutorial initial step not found');

    const { _prepare: prepareStep } = helper.actions || {};
    const nextStep = lib.utils.structuredClone(helper, { convertFuncToString: true });
    if (prepareStep) prepareStep(nextStep, { isMobile });
    if (!nextStep.hideTime) nextStep.hideTime = null; // мог быть установлен в предыдущем helper`е
    user.set({ helper: nextStep });
    user.set({ currentTutorial: { active: tutorialName } });
    if (usedLink) {
      globalTutorialData.helperLinks[usedLink] = { used: true };
      if (user.gameId) lib.store.broadcaster.publishAction(`game-${user.gameId}`, 'playerUseTutorialLink', { user });
    }
  } else if (currentTutorial.active) {
    if (action === 'exit') {
      user.set({
        helper: null,
        currentTutorial: null,
      });
      globalTutorialData.finishedTutorials[currentTutorial.active] = true;
    } else {
      const tutorial = lib.helper.getTutorial(currentTutorial.active);
      const { _prepare: prepareStep } = tutorial[step].actions || {};
      const nextStep = lib.utils.structuredClone(tutorial[step], { convertFuncToString: true });
      if (prepareStep) prepareStep(nextStep, { isMobile });
      if (!nextStep.hideTime) nextStep.hideTime = null; // мог быть установлен в предыдущем helper`е

      if (nextStep) {
        user.set({ helper: nextStep }, { reset: ['helper', 'helper.actions'] }); // reset обязателен, так как набор ключей в каждом helper-step может быть разный
        user.set({ currentTutorial: { step } });
      } else {
        user.set({
          helper: null,
          currentTutorial: null,
        });
        globalTutorialData.finishedTutorials[currentTutorial.active] = true;
      }
    }
  } else {
    user.set({ helper: null });
  }

  await user.saveChanges();
  if (Object.keys(globalTutorialData.finishedTutorials).length || Object.keys(globalTutorialData.helperLinks).length) {
    user.set({ ...globalTutorialData });
    await user.saveChanges({ saveToLobbyUser: true });
  }
  
  return { status: 'ok' };
};
