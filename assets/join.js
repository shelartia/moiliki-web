// Gmail strips custom-scheme links from messages, so an invitation is an https page that hands the code to the app.
(function () {
  var code = new URLSearchParams(location.search).get('c') || '';
  if (!/^[A-Z2-9]{8}$/.test(code)) {
    document.getElementById('invalid').hidden = false;
    return;
  }
  var target = 'moiliki://family/join?code=' + code;
  document.getElementById('code').textContent = code;
  document.getElementById('open').href = target;
  document.getElementById('valid').hidden = false;
  location.href = target;
})();
