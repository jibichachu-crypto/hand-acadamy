fetch("/session", {
  method: "GET",
  credentials: "include"
})
  .then(function (response) {
    if (!response.ok) {
      throw new Error("Unauthorized");
    }

    return response.json();
  })
  .then(function (data) {
    if (!data.authenticated) {
      window.location.replace("login.html");
    }
  })
  .catch(function () {
    window.location.replace("login.html");
  });
