plugins {
    java
}

group = "fr.vaeloria"
version = "0.2.1"

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(21))
}

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
    maven("https://jitpack.io")
}

dependencies {
    // Fournie par le serveur : non incluse dans le jar.
    compileOnly("io.papermc.paper:paper-api:1.21.4-R0.1-SNAPSHOT")
    // Vault : nécessaire aux paris (débit et versement de la monnaie du serveur). Sans lui, les combats ont lieu sans paris.
    compileOnly("com.github.MilkBowl:VaultAPI:1.7.1") { isTransitive = false }
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}

tasks.processResources {
    filesMatching("plugin.yml") { expand("version" to project.version) }
}
