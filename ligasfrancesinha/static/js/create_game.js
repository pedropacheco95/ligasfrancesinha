function changePlayer(index,selectObject){
    let player_id = selectObject.value;
    document.getElementById(`goals_${index}`).setAttribute("name",`goals_${player_id}`);
    let url = `/api/player_image_url/${player_id}`
    $.getJSON(url, function(data) {
        let image = document.getElementById(`image_${index}`)
        image.src = data;
    });
}

function switchPlayer(new_id){
    let playerToBeChangedId = modalActivator.dataset.player_id;
    let row = document.getElementById('player_row_' + playerToBeChangedId)
    row.id = 'player_row_' + new_id;
    team = row.dataset.team;
    let url = `/api/player_edition_row/${new_id}/${team}`
    $.getJSON(url, function(data) {
        var newRow = document.createElement('div');
        newRow.innerHTML = data.html;
        row.parentNode.replaceChild(newRow, row);
        createDraggableRows(newRow)
        closeModal('undefined',modalActivator);
    });
}

document.addEventListener('DOMContentLoaded', (event) => {
    const draggableRows = document.querySelectorAll('.drag_to_delete');
  
    draggableRows.forEach(row => {
      createDraggableRows(row)
    });
  });

  function createDraggableRows(row){
    let startX;
    let currentX;
    let isDragging = false;

    const startDrag = (clientX) => {
      
      isDragging = true;
      startX = clientX;
      currentX = 0;
      row.classList.add('is-dragging');
    };

    const onDrag = (clientX) => {
      if (!isDragging) return;
      currentX = clientX - startX;
      if (currentX < -10) {
          currentX = -210;
      } else if (currentX > 0) {
          currentX = 0;
      }
      // Apply the opposite transform to the trash icon to keep it in view
      row.querySelector('.trash').style.transform = `translateX(${100 + currentX}%)`;
    };

    const endDrag = (e) => {
      e.preventDefault();
      if (!isDragging) return;
      isDragging = false;
    };

    const handleScroll = (e) => {
      const isHorizontalScroll = Math.abs(e.wheelDeltaX) > Math.abs(e.wheelDeltaY) || Math.abs(e.deltaX) > Math.abs(e.deltaY);
      
      if (isHorizontalScroll) {
        e.preventDefault();
      
        const scrollDirection = e.wheelDeltaX < 0 || e.deltaX > 0 ? -1 : 1;
        const trashIconPosition = scrollDirection * 110;
        row.querySelector('.trash').style.transform = `translateX(${trashIconPosition}%)`;
      }
    };
    
    // Mouse events
    row.addEventListener('mousedown', (e) => startDrag(e.clientX));
    document.addEventListener('mousemove', (e) => onDrag(e.clientX));
    document.addEventListener('mouseup', (e) => endDrag(e));

    // Touch events
    row.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX));
    document.addEventListener('touchmove', (e) => onDrag(e.touches[0].clientX));
    document.addEventListener('touchend', (e) => endDrag(e));

    //Scroll events
    row.addEventListener('wheel', handleScroll); 

    row.querySelector('.trash').addEventListener('click', (e) => {
      modalActivator = row.getElementsByClassName('playerField')[0];
      switchPlayer('no_player')
    });
  }