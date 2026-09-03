import { NextResponse } from "next/server";

const BACKEND =
(
process.env.MONDESCALE_BACKEND_URL
||
process.env.BACKEND_URL
||
"http://backend:4000"
).replace(/\/$/,"");

function headers(req){

    const h=new Headers();

    [
        "authorization",
        "cookie",
        "accept",
        "x-request-id",
        "x-tenant-id",
        "x-tenant-slug"
    ].forEach(k=>{

        const v=req.headers.get(k);

        if(v) h.set(k,v);

    });

    h.set("content-type","application/json");

    return h;

}

async function handler(req,{params}){

    const p=(await params).path||[];

    const url=
    BACKEND+
    "/network-site-provisioning"+
    (
        p.length
        ?"/"+p.join("/")
        :""
    );

    let body={};

    if(req.method!=="GET"){

        body=
        await req.json()
        .catch(()=>({}));

    }

    /*
        Le Launch Manager ne peut
        jamais publier automatiquement.
    */

    body.publish=false;
    body.overwrite=false;

    if(
        p.includes("preview")
    ){

        body.dryRun=true;

    }

    if(
        p.includes("execute")
    ){

        body.dryRun=false;

    }

    const r=
    await fetch(
        url,
        {
            method:req.method,
            headers:headers(req),
            body:
            req.method==="GET"
            ?undefined
            :JSON.stringify(body),
            cache:"no-store"
        }
    );

    const txt=await r.text();

    try{

        return NextResponse.json(
            JSON.parse(txt),
            {status:r.status}
        );

    }catch{

        return NextResponse.json(
            {
                error:"INVALID_RESPONSE",
                body:txt
            },
            {
                status:502
            }
        );

    }

}

export {
handler as GET,
handler as POST
};
