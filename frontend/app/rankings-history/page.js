async function load(){
 const r =
 await fetch(
 "http://backend:4000/seo/rankings-history",
 {cache:"no-store"}
 );

 return r.json();
}

export default async function Page(){

 const rows=await load();

 return(
<div style={{padding:30}}>

<h1>Historique positions Google</h1>

<table border="1">

<tr>
<th>Agence</th>
<th>Keyword</th>
<th>Google</th>
<th>Maps</th>
<th>Date</th>
</tr>

{
rows.map((r,i)=>

<tr key={i}>
<td>{r.agency_code}</td>
<td>{r.keyword}</td>
<td>{r.google_position}</td>
<td>{r.maps_position}</td>
<td>{r.captured_at}</td>
</tr>

)
}

</table>

</div>
)

}
