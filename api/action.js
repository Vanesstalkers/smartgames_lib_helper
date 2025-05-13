async (context, { action, step, tutorial: tutorialName, usedLink, isMobile }) => {
  const { userId } = context.session.state;
  const user = lib.store('user').get(userId);
  const globalTutorialData = { finishedTutorials: {}, helperLinks: {} };
  const { currentTutorial = {} } = user;

  if (tutorialName) {
    if (currentTutorial.active) throw new Error('Другое обучение уже активно в настоящий момент');
    
    const tutorial = lib.helper.getTutorial(tutorialName);
    const helper = step ? Object.entries(tutorial).find(([key]) => key === step)[1] 
                       : Object.values(tutorial).find(({ initialStep }) => initialStep);
    if (!helper) throw new Error('Tutorial initial step not found');

    const nextStep = prepareStep(helper, isMobile);
    user.set({ helper: nextStep, currentTutorial: { active: tutorialName } });

    if (usedLink) {
      globalTutorialData.helperLinks[usedLink] = { used: true };
      if (user.gameId) lib.store.broadcaster.publishAction(`game-${user.gameId}`, 'playerUseTutorialLink', { user });
    }
  } else if (currentTutorial.active) {
    if (action === 'exit') {
      Object.assign(globalTutorialData, {
        helper: null,
        currentTutorial: null,
        finishedTutorials: { [currentTutorial.active]: true }
      });
    } else {
      const tutorial = lib.helper.getTutorial(currentTutorial.active);
      const nextStep = prepareStep(tutorial[step], isMobile);
      
      if (nextStep) {
        user.set({ helper: nextStep }, { reset: ['helper', 'helper.actions'] }); // reset обязателен, так как набор ключей в каждом helper-step может быть разный
        user.set({ currentTutorial: { step } });
      } else {
        Object.assign(globalTutorialData, {
          helper: null,
          currentTutorial: null,
          finishedTutorials: { [currentTutorial.active]: true }
        });
      }
    }
  } else {
    globalTutorialData.helper = null;
  }

  await user.saveChanges();
  const hasGlobalChanges = Object.keys(globalTutorialData.finishedTutorials).length || 
                          Object.keys(globalTutorialData.helperLinks).length ||
                          globalTutorialData.helper !== undefined ||
                          globalTutorialData.currentTutorial !== undefined;

  if (hasGlobalChanges) {
    user.set({ ...globalTutorialData });
    await user.saveChanges({ saveToLobbyUser: true });
  }

  return { status: 'ok' };
};

function prepareStep(helper, isMobile) {
  const { _prepare: prepareStep } = helper.actions || {};
  const nextStep = lib.utils.structuredClone(helper, { convertFuncToString: true });
  if (prepareStep) prepareStep(nextStep, { isMobile });
  if (!nextStep.hideTime) nextStep.hideTime = null;
  return nextStep;
}
