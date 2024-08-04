// todo: this currently polutes the global variables !!! Adjust this so that it doesn't.

const cardContainer = document.getElementById("card-container");
const cardCountElem = document.getElementById("card-count");
const cardTotalElem = document.getElementById("card-total");
const firstGhostCard = document.getElementById("first-loader-card");

const cardLimit = 99; // todo: do we need this limit ? If we get [] from request we can assume end
const cardIncrease = 9; // todo: card increase is amount from request fetch('/images/0/part/0');

// todo: create another endpoint to get this information?
const pageCount = 200; // Math.ceil(cardLimit / cardIncrease);

const amountOfImagesOnOneRow = 5;
let currentPage = 1;
let currentAmountLoaded = 0;
let additionalGhostCardAmount = 0;

cardTotalElem.innerHTML = cardLimit;

var throttleTimer;
const throttle = (callback, time) => {
  if (throttleTimer) return;

  throttleTimer = true;

  setTimeout(() => {
    callback();
    throttleTimer = false;
  }, time);
};

const getRandomColor = () => {
  const h = Math.floor(Math.random() * 360);

  return `hsl(${h}deg, 90%, 85%)`;
};

const createImage = (cardElement, url) => {
	const img = document.createElement("img");
	img.src = url;

	cardElement.appendChild(img);
};

const createCard = (url) => {
  const card = document.createElement("div");
  card.className = "card";

  // todo: instead of index number being added to the card,
  //    an image using the extracted image path returned from the request will be added
  createImage(card, url);

  card.style.backgroundColor = getRandomColor();

  // todo: this seems bad to have the append to the container here?
  cardContainer.insertBefore(card, firstGhostCard);
};

const addCards = (pageIndex) => {
  currentPage = pageIndex;

  // TODO: make it possible to select which zip file (index) to fetch
  const imageListIndex = 1;
  fetch('/images/' + imageListIndex + '/part/' + (pageIndex - 1))
  .then((response) => {
	  return response.json();
  }).then((imagePathList) => {
	  for (let i = 0; i < imagePathList.length; i++) {
		  createCard(imagePathList[i]);
	  }
	  currentAmountLoaded += imagePathList.length;

	  updateGhostCards();
  })
  .catch((err) => {
	  // fetch failed
	  console.error(err);
  });
};

const updateGhostCards = () => {
  additionalGhostCardAmount = amountOfImagesOnOneRow - (currentAmountLoaded % amountOfImagesOnOneRow);

  cardContainer.querySelectorAll('.additional-card').forEach((elem) => {
	  elem.remove();
  });

  // additional ghost cards should only fill a row up, not add an additional row
  if (additionalGhostCardAmount === amountOfImagesOnOneRow) {
	  additionalGhostCardAmount = 0;
  }

  // check whether we can simplify the copying of the ghostcard element. ...
  // complete the row with ghost cards
  for (let i = 0; i < additionalGhostCardAmount; i++) {
    const ghostCard = document.createElement('div');
    ghostCard.className = "additional-card skeleton-card card";

    cardContainer.appendChild(ghostCard);
  }

  // have an entire last row being ghost cards
  for (let i = 0; i < (amountOfImagesOnOneRow - 1); i++) {
    const ghostCard = document.createElement('div');
    ghostCard.className = "additional-card skeleton-card card";

    cardContainer.appendChild(ghostCard);
  }
};


// todo: not exactly a fan of this here. This should be able to be done better!
const handleInfiniteScroll = (ev) => {
  throttle(() => {

	  const cardOffsetHeight = document.getElementsByClassName("card")[0].offsetHeight;
	  let reduceBodyOffset = (additionalGhostCardAmount >= 1) ? (cardOffsetHeight * 2) : cardOffsetHeight;

	  // todo: this would cause a redraw each time, can't we just grab the scrolloffset
	  //    from the event object or something?
	  // todo: only value that changes is window.pageYOffset. The other values can be stored in a variable!
	  //    ... although if that is done, then a window resize eventlistener needs to be placed as well.
    const endOfPage =
      (window.innerHeight + window.pageYOffset) >= (document.body.offsetHeight - reduceBodyOffset);

    if (endOfPage) {
      addCards(currentPage + 1);
    }

    if (currentPage === pageCount) {
      removeInfiniteScroll();
    }
  }, 1000);
};

const removeInfiniteScroll = () => {
  // when we have reached the end, remove all the ghost cards
  cardContainer.querySelectorAll('.skeleton-card').forEach((elem) => {
	  elem.remove();
  });

  window.removeEventListener("scroll", handleInfiniteScroll);
};

window.onload = function () {
  addCards(currentPage);
};

window.addEventListener("scroll", handleInfiniteScroll);
