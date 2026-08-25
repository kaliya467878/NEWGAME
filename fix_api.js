const fs = require('fs');

let path = 'app/api/auth/register/route.ts';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Remove strict referralCode requirement
  const oldCode1 = `if (!referralCode || !referralCode.trim()) {
      return NextResponse.json({ message: "Invite code is required." }, { status: 400 });
    }`;
  
  const oldCode2 = `const parent = await prisma.user.findUnique({
      where: { referralCode: referralCode.trim().toUpperCase() },
    });

    if (!parent) {
      return NextResponse.json({ message: "Invalid invite code." }, { status: 400 });
    }

    const referredById = parent.id;`;
    
  const newCode = `let referredById = null;
    if (referralCode && referralCode.trim()) {
      const parent = await prisma.user.findUnique({
        where: { referralCode: referralCode.trim().toUpperCase() },
      });
      if (parent) {
        referredById = parent.id;
      }
    }`;

  if (code.includes(oldCode2)) {
    code = code.replace(oldCode1, '');
    code = code.replace(oldCode2, newCode);
    fs.writeFileSync(path, code);
    console.log('Fixed API to make invite code optional');
  }
}

let formPath = 'components/auth/RegisterForm.js';
if (fs.existsSync(formPath)) {
  let code = fs.readFileSync(formPath, 'utf8');
  
  const oldFormReq = `if (!form.inviteCode || !form.inviteCode.trim()) {
      setError("Invite code is required.");
      return;
    }`;
    
  if (code.includes(oldFormReq)) {
    code = code.replace(oldFormReq, '');
    fs.writeFileSync(formPath, code);
    console.log('Fixed Form to make invite code optional');
  }
}
