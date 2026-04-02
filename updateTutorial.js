async (user, { action, step, tutorial: tutorialName, usedLink, workerDealSellerPlayerId } = {}) => {
  const globalTutorialData = { finishedTutorials: {}, helperLinks: {} };
  const { currentTutorial = {}, finishedTutorials = {}, helperLinks = {}, getTutorial = lib.helper.getTutorial } = user;
  const usedCount = (finishedTutorials[currentTutorial.active]?.count || 0) + 1;

  if (tutorialName) {
    if (tutorialName === 'game-tutorial-workerDeal') {
      if (workerDealSellerPlayerId != null) user.set({ workerDealSellerPlayerId });
    } else {
      user.set({ workerDealSellerPlayerId: null });
    }

    if (action === 'changeTutorial') {
      Object.assign(globalTutorialData, {
        finishedTutorials: { [currentTutorial.active]: { usedCount } },
      });
    } else if (currentTutorial.active) throw new Error('Другое обучение уже активно в настоящий момент');

    const { steps: tutorial, utils = {} } = getTutorial(tutorialName);
    const helper = step
      ? Object.entries(tutorial).find(([key]) => key === step)[1]
      : Object.values(tutorial).find(({ initialStep }) => initialStep) || Object.values(tutorial)[0];

    if (!helper) throw new Error('Tutorial initial step not found');

    const nextStep = prepareStep(helper, { utils });
    user.set({ helper: nextStep, currentTutorial: { active: tutorialName } }, { reset: ['helper'] });

    if (usedLink) {
      const usedCount = (helperLinks[usedLink]?.usedCount || 0) + 1;
      globalTutorialData.helperLinks[usedLink] = { used: true, usedCount };
    }
  } else if (currentTutorial.active) {
    if (action === 'exit') {
      Object.assign(globalTutorialData, {
        helper: null,
        currentTutorial: null,
        finishedTutorials: { [currentTutorial.active]: { usedCount } },
        workerDealSellerPlayerId: null,
      });
    } else {
      const { steps: tutorial, utils = {} } =
        user.getTutorial?.(currentTutorial.active) || lib.helper.getTutorial(currentTutorial.active);
      await maybeBootstrapWorkerDealBuyResource(user, step);
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
          workerDealSellerPlayerId: null,
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

  async function maybeBootstrapWorkerDealBuyResource(user, step) {
    if (step !== 'buyResource') return;
    if (user.currentTutorial?.active !== 'game-tutorial-workerDeal') return;
    const game = user.gameId ? lib.store('game').get(user.gameId) : null;
    const buyer = game && user.playerId ? game.get(user.playerId) : null;
    if (!game || !buyer) return;
    const ui = user.workerDealPickUI || buyer.eventData?.workerDealPickUI;
    if (ui?.pickButtons?.length) return;
    const sellerPlayerId = user.workerDealSellerPlayerId;
    if (!sellerPlayerId) return;
    const startPick = domain?.game?.actions?.workerDealStartPick;
    if (typeof startPick !== 'function') return;
    try {
      await startPick.call(game, { sellerPlayerId, amount: 1 }, buyer);
    } catch (err) {
      console.error('workerDeal tutorial buyResource bootstrap', err);
    }
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

    // Проверяем наличие кнопки с флагом default
    if (nextStep.buttons && Array.isArray(nextStep.buttons) && nextStep.buttons.length > 0) {
      const hasDefaultButton = nextStep.buttons.some((button) => button.default);
      if (!hasDefaultButton && nextStep.buttons[0].key !== null) {
        nextStep.buttons[0].default = true;
      }
    }

    return nextStep;
  }
};
