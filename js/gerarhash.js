import bcrypt from "bcrypt";

const gerarHash = async () => {
  const senha = "Prime@2025";
  const hash = await bcrypt.hash(senha, 10);
  console.log("Hash gerado:", hash);
};

gerarHash();
