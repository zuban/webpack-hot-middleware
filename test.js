/**
 * Created by sergeyzubov on 30/01/2017.
 */

for (var i = 0; i < filesCount; i++) {
    var text = fs.readFileSync('profile.html', 'utf8');
    console.log(text)
    var url = 'https://www.linkedin.com/in/iteles';
    profile(url, text, function (err, data) {
        fs.writeFile("/writeDir", JSON.stringify(data, null, 2), function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        });
    })
}
