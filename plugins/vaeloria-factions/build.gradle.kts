plugins {
    java
}

group = "fr.vaeloria"
version = "1.0.0"

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(21))
}

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
    maven("https://jitpack.io")
}

dependencies {
    // Fournies par le serveur : non incluses dans le jar. Gson et Adventure sont embarqués par Paper.
    compileOnly("io.papermc.paper:paper-api:1.21.4-R0.1-SNAPSHOT")
    // Vault est facultatif : la banque de faction s'active seulement s'il est présent.
    compileOnly("com.github.MilkBowl:VaultAPI:1.7.1") { isTransitive = false }
    testImplementation("io.papermc.paper:paper-api:1.21.4-R0.1-SNAPSHOT")
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}

tasks.processResources {
    filesMatching("plugin.yml") { expand("version" to project.version) }
}
