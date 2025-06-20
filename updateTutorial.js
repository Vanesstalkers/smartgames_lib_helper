async (user, { action, step, tutorial: tutorialName, usedLink, isMobile }) => {
  const globalTutorialData = { finishedTutorials: {}, helperLinks: {} };
  const { currentTutorial = {} } = user;

  if (tutorialName) {
    if (currentTutorial.active) throw new Error('Другое обучение уже активно в настоящий момент');

    const { steps: tutorial, utils = {} } = lib.helper.getTutorial(tutorialName);
    const helper = step ? Object.entries(tutorial).find(([key]) => key === step)[1]
      : Object.values(tutorial).find(({ initialStep }) => initialStep);
    if (!helper) throw new Error('Tutorial initial step not found');

    const nextStep = prepareStep(helper, { utils });
    user.set({ helper: nextStep, currentTutorial: { active: tutorialName } });

    if (usedLink) globalTutorialData.helperLinks[usedLink] = { used: true };
    if (user.gameId) lib.store.broadcaster.publishAction.call(user, `game-${user.gameId}`, 'playerUseTutorial', { user, usedLink });
  } else if (currentTutorial.active) {
    if (action === 'exit') {
      Object.assign(globalTutorialData, {
        helper: null,
        currentTutorial: null,
        finishedTutorials: { [currentTutorial.active]: true }
      });
    } else {
      const { steps: tutorial, utils = {} } = lib.helper.getTutorial(currentTutorial.active);
        const nextStep = prepareStep(tutorial[step], { utils });

      if (nextStep) {
        user.set({ helper: nextStep }, {
          reset: ['helper', 'helper.actions'], // reset обязателен, так как набор ключей в каждом helper-step может быть разный
          removeEmptyObject: true, // делаем из-за helper.utils, который всегда одинаковый (в changes заишется как {}, что приведет к затиранию в БД)
        });
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
    user.set({ ...globalTutorialData }, { removeEmptyObject: true }); // из-за прдустановленного globalTutorialData.finishedTutorials может уйи пустой объект и перетереться его содержимое в БД
    await user.saveChanges({ saveToLobbyUser: true });
  }

  function prepareStep(helper, { utils }) {
    const nextStep = lib.utils.structuredClone({ ...helper, utils }, { convertFuncToString: true });
    if (nextStep.active) {
      if (!Array.isArray(nextStep.active)) nextStep.active = [nextStep.active];
      for (const [key, val] of Object.entries(nextStep.active)) {
        if (typeof val === 'string') nextStep.active[key] = { selector: val };
      }
    }
    if (!nextStep.hideTime) nextStep.hideTime = null;
    return nextStep;
  }
};
