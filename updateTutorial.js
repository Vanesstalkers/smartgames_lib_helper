async (user, { action, step, tutorial: tutorialName, usedLink }) => {
  const globalTutorialData = { finishedTutorials: {}, helperLinks: {} };
  const { _id: userId, gameId, currentTutorial = {}, finishedTutorials = {}, helperLinks = {} } = user;
  const usedCount = (finishedTutorials[currentTutorial.active]?.count || 0) + 1;

  if (tutorialName) {
    if (action === 'changeTutorial') {
      Object.assign(globalTutorialData, {
        finishedTutorials: { [currentTutorial.active]: { usedCount } },
      });
    } else if (currentTutorial.active) throw new Error('Другое обучение уже активно в настоящий момент');

    const { steps: tutorial, utils = {} } = lib.helper.getTutorial(tutorialName);
    const helper = step ?
      Object.entries(tutorial).find(([key]) => key === step)[1] :
      Object.values(tutorial).find(({ initialStep }) => initialStep);

    if (!helper) throw new Error('Tutorial initial step not found');

    const nextStep = prepareStep(helper, { utils });
    user.set({ helper: nextStep, currentTutorial: { active: tutorialName } }, { reset: ['helper'] });

    if (gameId && usedLink && (helperLinks[usedLink]?.used || 0) < 2) {
      lib.store.broadcaster.publishAction.call(user, `game-${gameId}`, 'playerUseTutorial', { userId, usedLink });
    }

    if (usedLink) {
      const used = (helperLinks[usedLink]?.used || 0) + 1;
      globalTutorialData.helperLinks[usedLink] = { used };
    }
  } else if (currentTutorial.active) {
    if (action === 'exit') {
      Object.assign(globalTutorialData, {
        helper: null,
        currentTutorial: null,
        finishedTutorials: { [currentTutorial.active]: { usedCount } },
      });
    } else {
      const { steps: tutorial, utils = {} } = lib.helper.getTutorial(currentTutorial.active);
      const nextStep = prepareStep(tutorial[step], { utils });

      if (nextStep) {
        user.set(
          { helper: nextStep },
          {
            // reset обязателен, так как набор ключей в каждом helper-step может быть разный
            reset: ['helper', 'helper.actions'],
            /* делаем из-за helper.utils, который всегда одинаковый
            (в changes запишется как {}, что приведет к затиранию в БД) */
            removeEmptyObject: true,
          }
        );
        user.set({ currentTutorial: { step } });
      } else {
        Object.assign(globalTutorialData, {
          helper: null,
          currentTutorial: null,
          finishedTutorials: { [currentTutorial.active]: { usedCount } },
        });
      }
    }
  } else {
    globalTutorialData.helper = null;
  }

  await user.saveChanges();
  const hasGlobalChanges =
    Object.keys(globalTutorialData.finishedTutorials).length ||
    Object.keys(globalTutorialData.helperLinks).length ||
    globalTutorialData.helper !== undefined ||
    globalTutorialData.currentTutorial !== undefined;

  if (hasGlobalChanges) {
    /* из-за предустановленного globalTutorialData.finishedTutorials
    может уйти пустой объект и перетереться его содержимое в БД */
    user.set({ ...globalTutorialData }, { removeEmptyObject: true });
    await user.saveChanges();
  }

  function prepareStep(helper, { utils }) {
    const prepareFunction = helper.prepare;
    const img = helper.img ? `${lib.lobby.__tutorialImgPrefix}${helper.img}` : undefined;
    const nextStep = lib.utils.structuredClone({ ...helper, utils, img }, { convertFuncToString: true });

    if (prepareFunction) prepareFunction({ step: nextStep, user });

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
