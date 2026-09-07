/**
 * A block-list of the most common / breached passwords (ticket 02: "rejected if
 * it appears in the top ~1,000 common/breached passwords, NIST-style").
 *
 * This is a curated starter drawn from the well-known published lists (rockyou,
 * NCSC top-100k, SecLists top-1000, keyboard walks, common word + year forms).
 * Replace it with the full SecLists `10-million-password-list-top-1000.txt`
 * before launch — see docs/adr/0004. Comparison is case-insensitive; the app's
 * only other rule is a 10-character minimum, so short classics like "password"
 * are already rejected by length — the value here is the 10+ character common
 * forms ("password123", "qwertyuiop", "iloveyou123").
 */
const RAW = [
  "password", "password1", "password12", "password123", "password1234",
  "password!", "Password1", "Password123", "Password1234", "passw0rd",
  "p@ssw0rd", "p@ssword", "passw0rd123", "welcome123", "welcome1234",
  "letmein123", "letmein1234", "iloveyou", "iloveyou1", "iloveyou123",
  "iloveyou2", "sunshine1", "sunshine123", "princess1", "princess123",
  "football1", "football123", "baseball1", "baseball123", "superman1",
  "superman123", "batman123", "trustno1", "trustno123", "whatever1",
  "whatever123", "monkey123", "monkey1234", "dragon123", "dragon1234",
  "master123", "master1234", "shadow123", "shadow1234", "michael1",
  "michael123", "jennifer1", "jennifer123", "jordan123", "hunter123",
  "harley123", "ranger123", "buster123", "thomas123", "robert123",
  "soccer123", "hockey123", "killer123", "george123", "charlie1",
  "charlie123", "andrew123", "michelle1", "michelle123", "daniel123",
  "ashley123", "bailey123", "passwordpassword", "adminadmin", "admin123",
  "admin1234", "administrator", "root12345", "toor12345", "qwerty123",
  "qwerty1234", "qwertyuiop", "qwertyui", "qwerty12345", "asdfghjkl",
  "asdfghjk", "zxcvbnm123", "1qaz2wsx", "1qaz2wsx3edc", "1q2w3e4r",
  "1q2w3e4r5t", "1qazxsw2", "zaq12wsx", "qazwsxedc", "qweasdzxc",
  "123456789", "1234567890", "12345678910", "0123456789", "123123123",
  "112233445566", "121212121212", "123321123321", "654321654321",
  "111111111111", "000000000000", "999999999999", "abcabcabc",
  "abcd1234", "abcd12345", "abc123456", "aaaaaaaaaa", "1111111111",
  "0000000000", "loveme123", "lovely123", "forever21", "forever123",
  "changeme123", "secret123", "secret1234", "test1234", "test12345",
  "testtest123", "computer1", "computer123", "internet123", "samsung123",
  "google123", "facebook1", "facebook123", "myspace123", "iphone123",
  "android123", "chocolate1", "chocolate123", "cookie123", "flower123",
  "summer2023", "summer2024", "summer2025", "winter2023", "winter2024",
  "winter2025", "spring2024", "spring2025", "autumn2024", "january2024",
  "freedom123", "nothing123", "welcome2024", "welcome2025", "qwerty2024",
  "startrek1", "starwars1", "starwars123", "pokemon123", "minecraft1",
  "minecraft123", "fortnite123", "liverpool1", "liverpool123", "arsenal123",
  "chelsea123", "barcelona1", "barcelona123", "realmadrid1", "manutd123",
  "jesus1234", "godislove1", "blessed123", "amazing123", "beautiful1",
  "beautiful123", "happiness1", "family123", "mother123", "father123",
  "brother123", "sister123", "december2023", "november2023", "october2023",
  "letmein2024", "trustme123", "believe123", "imagine123", "kingdom123",
  "warrior123", "hello12345", "helloworld", "helloworld1", "helloworld123",
  "goodluck123", "welcome01", "welcome00", "passw0rd!", "passw0rd1",
  "administrator1", "supervisor1", "engineer123", "manager123", "customer1",
  "default123", "welcome123!", "abcd@1234", "temp12345", "guest12345",
];

const BREACHED = new Set(RAW.map((p) => p.toLowerCase()));

export function isBreachedPassword(password: string): boolean {
  return BREACHED.has(password.toLowerCase());
}
