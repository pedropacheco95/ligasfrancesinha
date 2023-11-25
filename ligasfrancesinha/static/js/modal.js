let activation = document.getElementsByClassName("modalActivation");
let span = document.getElementsByClassName("closeModal");

let modalActivator;

for (let btn of activation) {
    btn.onclick = function() {
        modalActivationListener(btn)
    }
}

for (let element of span) {
    element.onclick = function() {
        let modal = document.getElementById(element.dataset.modal_id);
        closeModal(modal)
    }
}

function modalActivationListener(btn){
    let modal = document.getElementById(btn.dataset.modal_id);
    openModal(modal)
    modalActivator = btn;
}

function closeModal(modal, element=false) {
    if (element) {
        modal = document.getElementById(element.dataset.modal_id);
    }
    modal.style.display = "none";
    modalActivator = undefined;
}

function openModal(modal) {
    modal.style.display = "block";
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal(modal)
        }
    }
}

function createModal(title, modal_id, field_name,form_to_submit) {
    var modal = document.getElementById(modal_id);
    if (modal) {
        return modal
    };
    var modal = document.createElement('div');
    modal.setAttribute('class', 'modal');
    modal.setAttribute('id', modal_id);
    modal.setAttribute('style', 'display: block;');

    var modalContent = document.createElement('div');
    modalContent.setAttribute('class', 'modal_content');

    var modalHeader = document.createElement('div');
    modalHeader.setAttribute('class', 'modal_header');

    var modalTitle1 = document.createElement('h4');
    modalTitle1.textContent = title;
    modalHeader.appendChild(modalTitle1);

    var modalTitle2 = document.createElement('h4');
    modalTitle2.setAttribute('class', 'closeModal topButton');
    modalTitle2.setAttribute('data-modal_id', modal_id);
    modalTitle2.innerHTML = '&times;';
    modalHeader.appendChild(modalTitle2);

    modalContent.appendChild(modalHeader);

    var modalBody = document.createElement('div');
    modalBody.setAttribute('class', 'modal_body');

    modalContent.appendChild(modalBody);

    var modalFooter = document.createElement('div');
    modalFooter.setAttribute('class', 'modal_footer');

    var cancelButton = document.createElement('div');
    cancelButton.setAttribute('class', 'btn-secondary btn closeModal');
    cancelButton.setAttribute('data-modal_id', modal_id);
    cancelButton.textContent = 'Cancelar';

    var confirmButton = document.createElement('div');
    confirmButton.setAttribute('class', 'btn-success btn');
    confirmButton.setAttribute('data-modal_id', modal_id);
    confirmButton.setAttribute('name', field_name);
    confirmButton.setAttribute('id', 'confirm_create_' + field_name);
    confirmButton.textContent = 'Confirmar';

    var modalInputFooterButtonContainer = document.createElement('div');
    modalInputFooterButtonContainer.setAttribute('class', 'modal_input_footer_button_container');
    modalInputFooterButtonContainer.appendChild(cancelButton);
    modalInputFooterButtonContainer.appendChild(confirmButton);

    modalFooter.appendChild(modalInputFooterButtonContainer);

    modalContent.appendChild(modalFooter);
    modal.querySelectorAll('.closeModal').forEach(function(element) {
        element.onclick = function() {
            closeModal(modal)
        }
    });

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    modal.querySelectorAll('.closeModal').forEach(function(element) {
        element.onclick = function() {
            closeModal(modal)
        }
    });

    return modal
}

function addIframeToModal(modal,url) {
    // Create the iframe element
    var modalBody = document.createElement('div');
    modalBody.setAttribute('class', 'modal_iframe_container');
    modalBody.setAttribute('height', '100%');
    var modalIframe = document.createElement('iframe');
    modalIframe.setAttribute('src', url);
    modalIframe.setAttribute('width', '100%');
    modalIframe.setAttribute('height', '100%');

    // Add the iframe to the modal body
    modalBody.appendChild(modalIframe);
    modal.querySelector('.modal_body').innerHTML = '';
    modal.querySelector('.modal_body').appendChild(modalBody);

    // Show the modal
    openModal(modal);
}