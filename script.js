'use strict';

//
class WorkOut {
  id = String(Date.now()).slice(-10);
  date = new Date();
  clicks = 0;
  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }

  setDescribtion() {
    // prettier-ignore

    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    if (typeof this.date === 'string') this.date = new Date(this.date);
    this.discribtion = `${this.type[0].toUpperCase()}${this.type
      .slice(1)
      .toLowerCase()} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()} at ${
      String(this.date.getHours()).length === 1 ? '0' : ''
    }${this.date.getHours()}:${
      String(this.date.getMinutes()).length === 1 ? '0' : ''
    }${this.date.getMinutes()}`;
    this.date = this.date.toISOString();
  }

  increaseOnClick() {
    this.clicks++;
  }
  calcPace() {
    this.pace = (this.duration / this.distance).toFixed(3);
    return this.pace;
  }
  CalcSpeed() {
    this.speed = (this.distance / (this.duration / 60)).toFixed(3);
    return this.speed;
  }
}
class Cycling extends WorkOut {
  type = 'cycling';

  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.CalcSpeed();
    this.setDescribtion();
  }
}

class Runnig extends WorkOut {
  type = 'running';

  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.setDescribtion();
    this.cadence = cadence;
    this.calcPace();
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let sort = false;

class App {
  #map;
  #layers = [];
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    this.#getPosition();
    containerWorkouts.addEventListener('click', this.#editor.bind(this));
    document.querySelector('.Sort').addEventListener(
      'click',
      function (e) {
        sort = sort ? false : true;
        this.#sorter.call(this, e, sort);
      }.bind(this)
    );
    form.addEventListener('submit', this.#newWorkout.bind(this));
    containerWorkouts.addEventListener(
      'click',
      this.#deleteOneByOne.bind(this)
    );
    document
      .querySelector('.DeleteAllDiv')
      .addEventListener('click', this.reset.bind(this));
    inputType.addEventListener('change', this.#toggleElevationFiedls);
    containerWorkouts.addEventListener('click', this.#popup.bind(this));
    this.#getLocalStorage();
  }
  #editor(e) {
    if (!e.target.classList.contains('edit')) return;
    const LitoEdit = e.target.closest('li');
    const theworkoutToEdit = this.#workouts.find(
      el => el.id === LitoEdit.dataset.id
    );
    this.#formForEdit(LitoEdit, theworkoutToEdit);
  }

  #formForEdit(li, workout) {
    const html = `<form class="form editform">
          <div class="form__row">
            <label class="form__label">Type</label>
            <select class="form__input form__input--type form-edit-type">
              <option value="running">Running</option>
              <option value="cycling">Cycling</option>
            </select>
          </div>
          <div class="form__row">
            <label class="form__label">Distance</label>
            <input class="form__input form__input--distance distance--edit" placeholder="km" />
          </div>
          <div class="form__row">
            <label class="form__label">Duration</label>
            <input
              class="form__input form__input--duration duration--edit"
              placeholder="min"
            />
          </div>
          <div class="form__row">
            <label class="form__label">Cadence</label>
            <input
              class="form__input form__input--cadence edit--cadence"
              placeholder="step/min"
            />
          </div>
          <div class="form__row form__row--hidden">
            <label class="form__label">Elev Gain</label>
            <input
              class="form__input form__input--elevation edit--elevation"
              placeholder="meters"
            />
          </div>
          <button class="form__btn">OK</button>
        </form>`;
    li.insertAdjacentHTML('afterend', html);
    li.remove();
    const editDistance = document.querySelector('.distance--edit');
    editDistance.focus();
    const editDuration = document.querySelector('.duration--edit');
    const editElevation = document.querySelector('.edit--elevation');
    const editcadence = document.querySelector('.edit--cadence');
    const editInputType = document.querySelector('.form-edit-type');
    editInputType.addEventListener('change', () => {
      this.#toggleElevationFiedls(true, editElevation, editcadence);
    });

    document.querySelector('.editform').addEventListener('submit', e => {
      this.#workoutEditor(
        e,
        workout,
        editDistance,
        editDuration,
        editInputType,
        editcadence,
        editElevation
      );
    });
  }

  #workoutEditor(
    e,
    workout,
    editDistance,
    editDuration,
    editInputType,
    editcadence,
    editElevation
  ) {
    e.preventDefault();
    delete workout.elevationGain;
    delete workout.cadence;
    function assign() {
      workout.duration = editDuration.value;
      workout.distance = editDistance.value;
      workout.type = editInputType.value;
    }

    if (editInputType.value === 'running') {
      if (
        !this.#CheckIfItIsPositive(
          +editDuration.value,
          +editDistance.value,
          +editcadence.value
        ) ||
        !this.#CheckIfItIsValid(
          +editDistance.value,
          +editDuration.value,
          +editcadence.value
        )
      )
        return alert('invalid input');
      assign();
      workout.calcPace();
      workout.cadence = editcadence.value;
    } else {
      if (
        !this.#CheckIfItIsPositive(+editDuration.value, +editDistance.value) ||
        !this.#CheckIfItIsValid(
          +editDistance.value,
          +editDuration.value,
          +editElevation.value
        )
      )
        return alert('invalid input');
      assign();

      workout.elevationGain = editElevation.value;
      workout.CalcSpeed();
    }
    const theIndex = this.#workouts.findIndex(el => {
      return el.id === workout.id;
    });
    this.#workouts.splice(theIndex, 1, workout);
    workout.setDescribtion();
    this.#renderWorkout(workout, true);
    this.#renderWorkoutMarker(workout);
    this.#setLocalStorage();
  }
  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#restoringTheProtoTypeChain(data);

    this.#workouts.forEach(workout => {
      this.#renderWorkout(workout);
    });
  }
  #dataCopyAndAssign(el, workout) {
    Object.assign(workout, el);
    this.#workouts.push(workout);
  }
  #restoringTheProtoTypeChain(data) {
    data.forEach(el => {
      if (el.type === 'running') {
        const workout = Object.create(Runnig.prototype);
        workout.__proto__.constructor = Runnig;
        this.#dataCopyAndAssign(el, workout);
      } else {
        const workout = Object.create(Cycling.prototype);
        workout.__proto__.constructor = Cycling;
        this.#dataCopyAndAssign(el, workout);
      }
    });
  }

  #popup(e) {
    const workoutEl = e.target.closest('.workout');
    const span = e.target.classList.contains('deleter');
    const edit = e.target.classList.contains('edit');
    if (!workoutEl || span || edit) return;
    const workout = this.#workouts.find(el => el.id === workoutEl.dataset.id);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      duration: 1,
    });
    workout.increaseOnClick();
  }

  #getPosition() {
    navigator.geolocation.getCurrentPosition(
      this.#loadMap.bind(this),
      this.#userBlockedPositionTraking.bind(this),
      {
        enableHighAccuracy: true,
      }
    );
  }

  #loadMap(position) {
    const { longitude, latitude } = position.coords;
    const userCoords = [latitude, longitude];
    const latlng = L.latLng(...userCoords);
    this.#map = L.map('map').setView(latlng, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);
    this.#map.on('click', this.#showForm.bind(this));
    this.#workouts.forEach(workout => {
      this.#renderWorkoutMarker(workout);
    });
  }
  #setBound() {
    const layers = L.featureGroup(this.#layers);
    this.#map.flyToBounds(layers.getBounds(), {
      padding: [200, 200],
      maxZoom: 13,
    });
  }

  #userBlockedPositionTraking() {
    alert(' you can not use the webpage');
  }

  #showForm(event) {
    this.#mapEvent = event;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  #toggleElevationFiedls(edit = false, Runnig, Cycling) {
    if (edit === true) {
      Cycling.closest('.form__row').classList.toggle('form__row--hidden');
      Runnig.closest('.form__row').classList.toggle('form__row--hidden');
    } else {
      inputElevation
        .closest('.form__row')
        .classList.toggle('form__row--hidden');
      inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }
  }
  #CheckIfItIsValid(...inputs) {
    return inputs.every(inp => Number.isFinite(inp));
  }
  #CheckIfItIsPositive(...inputs) {
    return inputs.every(inp => inp > 0);
  }
  async #newWorkout(e) {
    try {
      e.preventDefault();
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      const { lat, lng } = this.#mapEvent.latlng;
      let workout;
      if (type === 'cycling') {
        const elevationGain = +inputElevation.value;
        if (
          !this.#CheckIfItIsPositive(distance, duration) ||
          !this.#CheckIfItIsValid(distance, duration, elevationGain)
        )
          return alert('invaild input');

        workout = new Cycling(distance, duration, [lat, lng], elevationGain);
      }
      if (type === 'running') {
        const cadane = +inputCadence.value;
        if (
          !this.#CheckIfItIsPositive(distance, duration, cadane) ||
          !this.#CheckIfItIsValid(distance, duration, cadane)
        )
          return alert('invaild input');

        workout = new Runnig(distance, duration, [lat, lng], cadane);
      }
      this.#workouts.push(workout);
      this.#hideForm();
      await this.#getWeather(workout);
      this.#renderWorkoutMarker(workout);
      this.#setLocalStorage();
      this.#renderWorkout(workout);
    } catch (err) {
      console.log(err);
    }
  }

  #renderWorkoutMarker(workout) {
    const popUp = L.popup({
      minWidth: 100,
      autoPan: false,
      maxWidth: 250,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    });
    const marker = L.marker(workout.coords);
    marker
      .addTo(this.#map)
      .bindPopup(popUp)
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}` +
          workout.discribtion +
          ` in ${workout.weather.location.name}🌡️${workout.weather.current.temp_c}°C (${workout.weather.current.condition.text})  `
      )
      .openPopup();
    this.#layers.push(marker);
    this.#setBound();
  }

  #renderWorkout(workout, edit = false) {
    let html = `
    
    
    <li class="workout workout--${workout.type}" data-id=${workout.id}>

        </div>
          <h2 class="workout__title"><p id="title">${workout.discribtion} </p>
          <div><span class="edit">🛠️</span>
           <span class=deleter${
             workout.type === 'running' ? 'R' : 'C'
           } id="delete">X</span><div> </h2> 

          <div class="workout__details">
            <span class="workout__icon"> ${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏙️</span>
            <span class="workout__value">${workout.weather.location.name}</span>
          </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        `;
    }
    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        `;
    }
    html += `<div class="workout__details">
            <span class="workout__icon" ><img src="https://${workout.icon}" style="height:30px;width:30px"></span>
            <span class="workout__value" >${workout.weather.current.condition.text}</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🌡️</span>
            <span class="workout__value">${workout.weather.current.temp_c}</span>
            <span class="workout__unit">°C
</span>
          </div>
          </li>`;
    if (edit) {
      document.querySelector('.editform').insertAdjacentHTML('afterend', html);
      document.querySelector('.editform').remove();
    } else form.insertAdjacentHTML('afterend', html);
    this.#showDeleteBtn();
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  #sorter(e, sort) {
    e.stopPropagation();
    const editForm = document.querySelector('.editform');
    if (editForm) return;
    if (sort) {
      this.#workouts.sort((a, b) => {
        if (a.date > b.date) return -1;
        else return 1;
      });
    } else if (sort === false) {
      this.#workouts.sort((a, b) => {
        if (a.date > b.date) return 1;
        else return -1;
      });
    }
    document.querySelectorAll('li').forEach(el => {
      el.remove();
    });
    this.#workouts.forEach(el => {
      this.#renderWorkout(el);
    });
  }
  #showDeleteBtn() {
    document.querySelectorAll('.DeleteAll').forEach(el => {
      el.classList.add('DeleteAllAfter');
    });
  }

  #deleteOneByOne(e) {
    if (
      !e.target.classList.contains('deleterC') &&
      !e.target.classList.contains('deleterR')
    )
      return;
    const theOneForDeletion = e.target.closest('li');
    const theOneForDeletionID = theOneForDeletion.dataset.id;
    const theOneForDeletionIndex = this.#workouts.findIndex(el => {
      return el.id === theOneForDeletionID;
    });

    this.#workouts.splice(theOneForDeletionIndex, 1);
    theOneForDeletion.remove();
    this.#setLocalStorage();
    location.reload();
  }
  async #getWeather(workout) {
    if (workout.weather) return;
    try {
      const [lat, lag] = workout.coords;
      const TheWeatherDataFromTheAjaxCall = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=d5cf23fdd8e343abac422716231207&q=${lat},${lag}&aqi=no`
      );
      if (!TheWeatherDataFromTheAjaxCall.ok)
        throw new Error('the data was not found');
      const theWeatherDataFormated = await TheWeatherDataFromTheAjaxCall.json();
      workout.weather = theWeatherDataFormated;
      workout.icon = workout.weather.current.condition.icon.slice(2);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

const app = new App();
