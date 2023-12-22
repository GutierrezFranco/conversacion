function generarConversacion() {
  const phoneNumber = document.getElementById('phoneNumber').value;
  if (phoneNumber) {
    const formattedNumber = encodeURIComponent(phoneNumber);
    const whatsappLink = `https://api.whatsapp.com/send?phone=${formattedNumber}`;
    window.location.href = whatsappLink;
  } else {
    alert('Por favor, introduce un número de teléfono válido.');
  }
}
