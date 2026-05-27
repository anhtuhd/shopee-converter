const longUrl = "https://s.shopee.vn/an_redir?utm_medium=affiliates&affiliate_id=17399820370&sub_id=anhtuhd&origin_link=https%3A%2F%2Fshopee.vn%2Fopaanlp%2F50508055%2F19993120616%3F__mobile__%3D1%26credential_token%3D8wEwiDL7XpqJqXPs2HFxc3ySFqQkHNcukbthmD52TK%26exp_group%3Drollout%26gads_t_sig%3DgqRjZGVrxHCFomtpsTE0MjUxOnRzc19zZGtfa2V5omt20QABpGFsZ2_SAAAAZKNkZWvAomN0xEAAAAAMRoz0ZUjQw0QlRa--FjB0AKnHQPF7xv4DyGj9-GQwqn4zSdB6gztmw7ebmtsZs9FPJxlVqctc57WUE3IRqmNpcGhlcnRleHTEkQAAAAx4M3MJc0dt6GF9G9bTYHDezVOOqlmAkEsOKkSWmVBJaniQs5Ms6gcNkmpfSvgDODamDo3Yd3GEWJKFKj4qi6-57T9dxf3v5pbrajr7EofD7IDKfdfMGqd8uGyxTPJhIKdo3cn1dGGwZ8iLlSzDmzU_FrERYNlzZ52M2DIZO4Vusp_pRqhdNYBttZfiSu4%26mmp_pid%3Dan_17384330546%26uls_trackid%3D55ntqnn600oi%26utm_campaign%3Did_9GwvspflWx%26utm_content%3D----%26utm_medium%3Daffiliates%26utm_source%3Dan_17384330546%26utm_term%3Dey8faaszz3yz";

console.log("Original longUrl length:", longUrl.length);

try {
  const urlObj = new URL(longUrl);
  console.log("Parsed using new URL().toString():");
  console.log(urlObj.toString());
  console.log("Are they identical?", longUrl === urlObj.toString());
  if (longUrl !== urlObj.toString()) {
    console.log("Difference:");
    console.log("Original:", longUrl);
    console.log("Parsed  :", urlObj.toString());
  }
} catch (e) {
  console.error("Failed to parse using new URL():", e.message);
}
